import axios from "axios";

async function main() {
  try {
    const pageId = "1036934312835044";
    const response = await axios.get(`http://localhost:3001/api/posts/page/${pageId}`);
    console.log("Response Success:", response.data.success);
    console.log("Data type:", typeof response.data.data);
    if (response.data.data.data) {
       console.log("Nested data count:", response.data.data.data.length);
       console.log("First post created_time:", response.data.data.data[0].created_time);
    } else {
       console.log("Data count:", response.data.data.length);
       console.log("First post created_time:", response.data.data[0].created_time);
    }
  } catch (error) {
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error Message:", error.message);
    }
  }
}

main();
