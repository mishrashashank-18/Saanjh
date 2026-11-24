const { spawn } = require("child_process")
const path = require("path")

const scriptPath = path.resolve(__dirname, "../../ml/matchmaker_service.py")

/**
 * Execute python matchmaker CLI command and return parsed JSON
 */
function runMatchmakerCLI(args) {
  return new Promise((resolve, reject) => {
    const pyProcess = spawn("python3", [scriptPath, ...args], {
      cwd: path.resolve(__dirname, "../../"),
      env: {
        ...process.env,
        TF_ENABLE_ONEDNN_OPTS: "0",
        PYTHONWARNINGS: "ignore",
      },
    })

    let stdout = ""
    let stderr = ""

    pyProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    pyProcess.stderr.on("data", (data) => {
      stderr += data.toString()
    })

    pyProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Matchmaker service error:", stderr)
        return reject(
          new Error(
            `Matchmaker service exited with code ${code}: ${stderr || stdout}`,
          ),
        )
      }

      try {
        // Find JSON payload in stdout (ignoring warning logs from TensorFlow)
        const lines = stdout.trim().split("\n")
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i].trim()
          if (line.startsWith("{") && line.endsWith("}")) {
            const parsed = JSON.parse(line)
            return resolve(parsed)
          }
        }
        reject(
          new Error("No valid JSON response found from matchmaker service."),
        )
      } catch (err) {
        reject(err)
      }
    })
  })
}

/**
 * Retrieve Qdrant & Transformer status
 */
async function getEngineStatus() {
  return runMatchmakerCLI(["--action", "status"])
}

/**
 * Synchronize all users into Qdrant vector database
 */
async function syncAllVectors() {
  return runMatchmakerCLI(["--action", "sync_all"])
}

/**
 * Upsert single user into Qdrant vector database
 */
async function upsertUserVector(userId) {
  return runMatchmakerCLI(["--action", "upsert", "--user-id", String(userId)])
}

/**
 * Calculate top matches for a user using Qdrant vector retrieval + Transformer inference
 */
async function getMatches(userId) {
  return runMatchmakerCLI(["--action", "match", "--user-id", String(userId)])
}

module.exports = {
  getEngineStatus,
  syncAllVectors,
  upsertUserVector,
  getMatches,
}
