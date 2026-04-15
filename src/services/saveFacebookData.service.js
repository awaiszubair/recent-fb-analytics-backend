const insightsService = require('./insights.service');
const PartnerRepo = require('../repositories/Partner');
const PageRepo = require('../repositories/ConnectedPage');
const PostRepo = require('../repositories/Post');
const PageInsightsRepo = require('../repositories/PageInsights');
const PostInsightsRepo = require('../repositories/PostInsights');
const EarningsRepo = require('../repositories/Earnings');
const SyncJobRepo = require('../repositories/SyncJob');
const ThirdPartyRepo = require('../repositories/ThirdPartyData');

class SaveFacebookDataService {

    // ─────────────────────────────────────────────
    // ORCHESTRATION: INITIAL CONNECTION SYNC
    // ─────────────────────────────────────────────

    /**
     * Main flow triggered on /facebook/connect
     * Fetches the user profile, creates Partner, fetches user's Pages, creates ConnectedPages,
     * then fetches page insights, posts, and post insights for each page.
     */
    async initialConnectionSync(accessToken) {
        console.log('--- STARTING INITIAL FACEBOOK SYNC ---');
        // 1. Fetch & Sync Partner
        const partner = await this.syncPartner(accessToken);
        console.log(`[SYNC] Partner synced: ${partner.name}`);

        // 2. Fetch User Pages
        const pagesResponse = await insightsService.getUserPages({ access_token: accessToken });
        if (!pagesResponse.success) throw new Error('Failed to fetch user pages from Facebook');

        const syncResults = {
            partner,
            pages: [],
            errors: []
        };

        // 3. Process Each Page
        for (const page of pagesResponse.data) {
            try {
                console.log(`[SYNC] Processing Page: ${page.name} (${page.id})`);

                // A. Save the Connected Page
                const syncedPage = await this.syncPage({
                    partner_id: partner.id,
                    fb_page_id: page.id,
                    page_name: page.name,
                    page_token_encrypted: page.access_token, // Encrypt in production!
                    fan_count: 0 // Default to 0, updating this later if needed
                });

                // B. Fetch & Save Page Insights
                console.log(`  -> Fetching Page Insights for ${page.name}`);
                const pageInsights = await this.syncPageInsights(page.id, page.access_token);

                // C. Fetch Page Posts (All posts paginated)
                console.log(`  -> Fetching Posts for ${page.name}`);
                const postsResponse = await insightsService.getPagePosts(page.id, { 
                    access_token: page.access_token, 
                    limit: 100, 
                    fetchAll: true 
                });
                const postsData = postsResponse.success ? postsResponse.data : [];

                const syncedPosts = [];
                // D. Step 1: Process Each Post (Save basic metadata)
                console.log(`  -> Saving ${postsData.length} posts for ${page.name}...`);
                for (const post of postsData) {
                    try {
                        const syncedPost = await this.syncPost({
                            page_id: page.id,
                            fb_post_id: post.id,
                            message: post.message,
                            type: post.status_type,
                            permalink: post.permalink_url,
                            created_time: post.created_time
                        });
                        syncedPosts.push({ fb_post_id: post.id, db_post: syncedPost, insightsCount: 0 });
                    } catch (postError) {
                        console.error(`  -> Failed to sync post ${post.id}`, postError.message);
                    }
                }

                // Step 2: Batch Fetch & Save Post Insights (Highly Optimized)
                if (syncedPosts.length > 0) {
                    console.log(`  -> Batch fetching insights for ${syncedPosts.length} posts...`);
                    const fbPostIds = syncedPosts.map(p => p.fb_post_id);
                    const defaultPostMetrics = ['post_impressions', 'post_impressions_unique', 'post_engaged_users', 'post_clicks'];
                    
                    try {
                        const allBatchResults = await insightsService.getMultiplePostInsights(
                            fbPostIds, 
                            defaultPostMetrics, 
                            { access_token: page.access_token }
                        );

                        for (const result of allBatchResults) {
                            const postMapping = syncedPosts.find(p => p.fb_post_id === result.postId);
                            if (result.success && postMapping) {
                                try {
                                    const savedInsights = await this.savePostInsightsFromData(postMapping.db_post.id, result.data.data);
                                    postMapping.insightsCount = savedInsights.length;
                                } catch (err) {
                                    console.warn(`    -> Could not save post insights for ${result.postId}: ${err.message}`);
                                }
                            }
                        }
                    } catch (batchErr) {
                        console.error(`  -> Failed batch insight fetch for page ${page.id}:`, batchErr.message);
                    }
                }

                // Add to results
                syncResults.pages.push({
                    page: syncedPage,
                    insightsCount: pageInsights.length,
                    postsCount: syncedPosts.length,
                    postsProcessed: syncedPosts.map(p => ({ post: p.db_post, insightsCount: p.insightsCount }))
                });
            } catch (pageError) {
                console.error(`[SYNC] Failed processing Page ${page.id}`, pageError.message);
                syncResults.errors.push({ pageId: page.id, error: pageError.message });
            }
        }

        console.log('--- INITIAL FACEBOOK SYNC COMPLETE ---');
        return syncResults;
    }


    // ─────────────────────────────────────────────
    // PARTNER
    // ─────────────────────────────────────────────

    /**
     * Fetch FB user via access token → upsert into partners table
     */
    async syncPartner(accessToken) {
        const fbUser = await insightsService.getUserDetails({ access_token: accessToken });
        if (!fbUser.success) throw new Error('Failed to fetch user details from Facebook');

        const { id, name, email } = fbUser.data;

        return await PartnerRepo.upsertPartner({
            user_id: id,
            name,
            email
        });
    }

    // ─────────────────────────────────────────────
    // CONNECTED PAGE
    // ─────────────────────────────────────────────

    /**
     * Upsert a Facebook Page record linked to a partner
     */
    async syncPage(pageData) {
        const { partner_id, fb_page_id, page_name, page_token_encrypted, fan_count } = pageData;

        return await PageRepo.upsertPage({
            partner_id,
            fb_page_id,
            page_name,
            page_token_encrypted,
            fan_count: fan_count || 0,
            is_active: true,
            last_synced_at: new Date()
        });
    }

    // ─────────────────────────────────────────────
    // POSTS
    // ─────────────────────────────────────────────

    /**
     * Upsert a single Facebook post into posts table
     */
    async syncPost(postData) {
        const { page_id, fb_post_id, message, type, permalink, created_time } = postData;

        return await PostRepo.upsertPost({
            page_id,
            fb_post_id,
            message,
            type,
            permalink,
            created_time: created_time ? new Date(created_time) : undefined,
            synced_at: new Date()
        });
    }

    // ─────────────────────────────────────────────
    // PAGE INSIGHTS
    // ─────────────────────────────────────────────

    /**
     * Fetch page insights from Facebook → upsert each metric entry into page_insights table
     */
    async syncPageInsights(pageId, accessToken, metrics, period, since, until) {
        const defaultMetrics = ['page_impressions', 'page_impressions_unique', 'page_reach', 'page_engaged_users'];

        const fbResponse = await insightsService.getPageInsights(
            pageId,
            metrics || defaultMetrics,
            { access_token: accessToken, period: period || 'day', since, until }
        );

        if (!fbResponse.success) throw new Error('Failed to fetch page insights from Facebook');

        const results = [];
        for (const insight of fbResponse.data.data) {
            for (const entry of insight.values) {
                const saved = await PageInsightsRepo.upsertPageInsight({
                    page_id: pageId,
                    metric_name: insight.name,
                    metric_value: entry.value,
                    period: insight.period,
                    end_time: entry.end_time ? new Date(entry.end_time) : undefined,
                    synced_at: new Date()
                });
                results.push(saved);
            }
        }

        return results;
    }

    // ─────────────────────────────────────────────
    // POST INSIGHTS
    // ─────────────────────────────────────────────

    /**
     * Fetch post insights from Facebook → upsert each metric entry into post_insights table
     */
    async syncPostInsights(postId, fbPostId, accessToken, metrics) {
        const defaultMetrics = ['post_impressions', 'post_impressions_unique', 'post_engaged_users', 'post_clicks'];

        const fbResponse = await insightsService.getPostInsights(
            fbPostId,
            metrics || defaultMetrics,
            { access_token: accessToken }
        );

        if (!fbResponse.success) throw new Error('Failed to fetch post insights from Facebook');

        return await this.savePostInsightsFromData(postId, fbResponse.data.data);
    }

    /**
     * Helper to save raw insights data for a post
     */
    async savePostInsightsFromData(dbPostId, insightsData) {
        const results = [];
        for (const insight of insightsData) {
            for (const entry of insight.values) {
                const saved = await PostInsightsRepo.upsertPostInsight({
                    post_id: dbPostId,
                    metric_name: insight.name,
                    metric_value: entry.value,
                    period: insight.period || null,
                    end_time: entry.end_time ? new Date(entry.end_time) : undefined,
                    synced_at: new Date()
                });
                results.push(saved);
            }
        }
        return results;
    }

    // ─────────────────────────────────────────────
    // EARNINGS
    // ─────────────────────────────────────────────

    /**
     * Upsert CM earnings for a page into cm_earnings_page table
     */
    async syncPageEarnings(earningsData) {
        const { page_id, earnings_amount, approximate_earnings, currency, period, end_time, content_type_breakdown } = earningsData;

        return await EarningsRepo.upsertPageEarnings({
            page_id,
            earnings_amount: earnings_amount || 0,
            approximate_earnings: approximate_earnings || 0,
            currency: currency || 'USD',
            period,
            end_time: end_time ? new Date(end_time) : undefined,
            content_type_breakdown: content_type_breakdown || null,
            synced_at: new Date()
        });
    }

    /**
     * Upsert CM earnings for a post into cm_earnings_post table
     */
    async syncPostEarnings(earningsData) {
        const { post_id, earnings_amount, approximate_earnings, currency, period, end_time } = earningsData;

        return await EarningsRepo.upsertPostEarnings({
            post_id,
            earnings_amount: earnings_amount || 0,
            approximate_earnings: approximate_earnings || 0,
            currency: currency || 'USD',
            period,
            end_time: end_time ? new Date(end_time) : undefined,
            synced_at: new Date()
        });
    }

    // ─────────────────────────────────────────────
    // SYNC JOBS
    // ─────────────────────────────────────────────

    /**
     * Create a new sync job record in sync_jobs table
     */
    async createSyncJob(pageId, jobType) {
        return await SyncJobRepo.createSyncJob({
            page_id: pageId,
            job_type: jobType,
            status: 'pending',
            started_at: new Date()
        });
    }

    /**
     * Update sync job status on completion or failure
     */
    async updateSyncJob(jobId, status, errorLog = null) {
        return await SyncJobRepo.updateSyncJob(jobId, {
            status,
            error_log: errorLog,
            completed_at: ['completed', 'failed'].includes(status) ? new Date() : undefined
        });
    }

    // ─────────────────────────────────────────────
    // THIRD PARTY DATA
    // ─────────────────────────────────────────────

    /**
     * Save third-party data linked to a page or post
     */
    async saveThirdPartyData(pageId, postId, dataType, value) {
        return await ThirdPartyRepo.createThirdPartyData({
            page_id: pageId || null,
            post_id: postId || null,
            data_type: dataType,
            value,
            synced_at: new Date()
        });
    }
}

module.exports = new SaveFacebookDataService();