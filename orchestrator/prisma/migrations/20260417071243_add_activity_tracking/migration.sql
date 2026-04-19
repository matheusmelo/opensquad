-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "squadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    CONSTRAINT "ActivityEvent_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "SquadExecution" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ActivityEvent" ("agentId", "aiModel", "costUsd", "durationMs", "executionId", "filePath", "id", "message", "payloadJson", "runId", "squadId", "timestamp", "tokensIn", "tokensOut", "toolName", "type") SELECT "agentId", "aiModel", "costUsd", "durationMs", "executionId", "filePath", "id", "message", "payloadJson", "runId", "squadId", "timestamp", "tokensIn", "tokensOut", "toolName", "type" FROM "ActivityEvent";
DROP TABLE "ActivityEvent";
ALTER TABLE "new_ActivityEvent" RENAME TO "ActivityEvent";
CREATE TABLE "new_AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "currentTask" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "durationMs" INTEGER,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costUsd" REAL,
    "exitCode" INTEGER,
    "error" TEXT,
    CONSTRAINT "AgentRun_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "SquadExecution" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentRun_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_AgentRun" ("agentId", "aiModel", "completedAt", "costUsd", "currentTask", "durationMs", "error", "executionId", "exitCode", "id", "startedAt", "status", "tokensIn", "tokensOut") SELECT "agentId", "aiModel", "completedAt", "costUsd", "currentTask", "durationMs", "error", "executionId", "exitCode", "id", "startedAt", "status", "tokensIn", "tokensOut" FROM "AgentRun";
DROP TABLE "AgentRun";
ALTER TABLE "new_AgentRun" RENAME TO "AgentRun";
CREATE TABLE "new_FileTouch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "linesAdded" INTEGER,
    "linesRemoved" INTEGER,
    "diffPreview" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileTouch_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileTouch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FileTouch" ("action", "agentId", "createdAt", "diffPreview", "filePath", "id", "linesAdded", "linesRemoved", "runId") SELECT "action", "agentId", "createdAt", "diffPreview", "filePath", "id", "linesAdded", "linesRemoved", "runId" FROM "FileTouch";
DROP TABLE "FileTouch";
ALTER TABLE "new_FileTouch" RENAME TO "FileTouch";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
