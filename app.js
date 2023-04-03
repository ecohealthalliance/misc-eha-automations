const crypto = require("crypto");
const axios = require("axios");

const secret = process.env.GITHUB_WEBHOOK_SECRET;
const token = process.env.GITHUB_TOKEN;

function verifySignature(event) {
  const signature = event.headers["X-Hub-Signature-256"];
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(event.body);
  const expectedSignature = "sha256=" + hmac.digest("hex");

  return signature === expectedSignature;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  if (!verifySignature(event)) {
    return {
      statusCode: 401,
      body: "Invalid signature",
    };
  }

  const githubEvent = event.headers["X-GitHub-Event"];
  const payload = JSON.parse(event.body);

  console.log("Payload:", payload);

  if (githubEvent === "create" && payload.ref_type === "repository") {
    const repoFullName = payload.repository.full_name;
    const repoUrl = `https://api.github.com/repos/${repoFullName}/dispatches`;

    try {
      await axios.post(
        repoUrl,
        { event_type: "created" },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.everest-preview+json",
          },
        }
      );

      console.log(`Dispatched repository_created event for ${repoFullName}`);

      return {
        statusCode: 200,
        body: "OK",
      };
    } catch (error) {
      console.error("Error dispatching event:", error.message);
      return {
        statusCode: 500,
        body: "Internal Server Error",
      };
    }
  } else {
    return {
      statusCode: 200,
      body: "OK",
    };
  }
};
