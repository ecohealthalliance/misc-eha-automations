const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const axios = require("axios");
const serverless = require("serverless-http");

app.use(bodyParser.json());

app.post("/webhook", async (req, res) => {
  const event = req.body;
  const eventType = req.get("X-GitHub-Event"); // Get the event type from the header

  // Respond to the ping event
  if (eventType === "ping") {
    res.sendStatus(200);
    return;
  }

  if (event.action === "created" && event.repository) {
    try {
      await triggerWorkflow(
        event.repository.owner.login,
        event.repository.name
      );
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

async function triggerWorkflow(owner, repo) {
  const token = process.env.GITHUB_TOKEN;
  const workflowId = "add_all_team_to_new_repos.yml";

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

  await axios.post(
    url,
    { ref: "main" },
    {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
}

module.exports.handler = serverless(app);
