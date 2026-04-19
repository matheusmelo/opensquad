-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionId" TEXT,
    "runId" TEXT,
    "agentId" TEXT,
    "squadId" TEXT,
    "type" TEXT NOT NULL,
    "filePath" TEXT,
    "toolName" TEXT,
    "aiModel" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" REAL,
    "durationMs" INTEGER,
    "message" TEXT,
    "payloadJson" TEXT,
    CONSTRAINT "ActivityEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "SquadExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityEvent" ("agentId", "aiModel", "costUsd", "durationMs", "executionId", "filePath", "id", "message", "payloadJson", "runId", "squadId", "timestamp", "tokensIn", "tokensOut", "toolName", "type") SELECT "agentId", "aiModel", "costUsd", "durationMs", "executionId", "filePath", "id", "message", "payloadJson", "runId", "squadId", "timestamp", "tokensIn", "tokensOut", "toolName", "type" FROM "ActivityEvent";
DROP TABLE "ActivityEvent";
ALTER TABLE "new_ActivityEvent" RENAME TO "ActivityEvent";
CREATE INDEX "ActivityEvent_squadId_idx" ON "ActivityEvent"("squadId");
CREATE INDEX "ActivityEvent_agentId_idx" ON "ActivityEvent"("agentId");
CREATE INDEX "ActivityEvent_timestamp_idx" ON "ActivityEvent"("timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
