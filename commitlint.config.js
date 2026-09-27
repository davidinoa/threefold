// You review every change, so agent attribution never belongs in a commit.
export const agentAttribution = [
  /^co-authored-by:/im, // Claude Code, Cursor, and others add this trailer
  /^claude-session:/im, // cloud and Remote Control sessions
  /generated (with|by) \[?(claude|cursor|copilot|codex|gemini|aider|devin)/i,
]

export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    /** @param {string} message */
    (message) => message.includes("Signed-off-by: dependabot[bot]"),
  ],
  plugins: [
    {
      rules: {
        /** @param {{ raw?: string }} commit */
        "no-agent-attribution": ({ raw }) => {
          const match = agentAttribution.find((pattern) =>
            pattern.test(raw ?? "")
          )
          return [!match, `remove agent attribution (${match})`]
        },
      },
    },
  ],
  rules: { "no-agent-attribution": [2, "always"] },
}
