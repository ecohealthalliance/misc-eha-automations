const https = require("https");
const crypto = require("crypto");

const secret = process.env.GITHUB_WEBHOOK_SECRET;
const token = process.env.GITHUB_TOKEN;
const repositoryOwner = process.env.REPOSITORY_OWNER;
const repositoryName = process.env.REPOSITORY_NAME;

exports.handler = async (event) => {
  const signature = event.headers["X-Hub-Signature-256"];
  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(event.body)
    .digest("hex")}`;

  if (signature !== expectedSignature) {
    return {
      statusCode: 401,
      body: "Unauthorized",
    };
  }

  const payload = JSON.parse(event.body);
  const branchName = payload.ref.split("/").pop();

  if (
    payload.repository.name !== repositoryName ||
    payload.repository.owner.login !== repositoryOwner ||
    branchName !== "main"
  ) {
    return {
      statusCode: 200,
      body: "Ignoring non-relevant event",
    };
  }

  const options = {
    hostname: "api.github.com",
    path: `/repos/${repositoryOwner}/${repositoryName}/actions/workflows/add_all_team_to_new_repos.yml/dispatches`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "Lambda",
    },
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => {
        responseBody += chunk;
      });
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: responseBody,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    const data = JSON.stringify({
      ref: branchName,
    });

    req.write(data);
    req.end();
  });

  return response;
};
