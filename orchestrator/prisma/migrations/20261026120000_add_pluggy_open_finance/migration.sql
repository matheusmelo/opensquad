-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluggyItemId" TEXT NOT NULL,
    "connectorName" TEXT NOT NULL,
    "connectorLogo" TEXT,
    "status" TEXT NOT NULL,
    "contexto" TEXT NOT NULL DEFAULT 'PF',
    "lastSyncAt" DATETIME,
    "error" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluggyAccountId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "subtipo" TEXT,
    "numero" TEXT,
    "saldo" REAL NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BankAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "data" DATETIME NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" REAL NOT NULL,
    "contexto" TEXT NOT NULL,
    "pulmao" INTEGER,
    "categoria" TEXT NOT NULL,
    "confianca" REAL NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "bankAccountId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("categoria", "confianca", "contexto", "createdAt", "data", "descricao", "id", "pulmao", "updatedAt", "userId", "valor") SELECT "categoria", "confianca", "contexto", "createdAt", "data", "descricao", "id", "pulmao", "updatedAt", "userId", "valor" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_externalId_key" ON "Transaction"("externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BankConnection_pluggyItemId_key" ON "BankConnection"("pluggyItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_pluggyAccountId_key" ON "BankAccount"("pluggyAccountId");

