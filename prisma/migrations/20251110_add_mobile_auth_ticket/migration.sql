-- CreateTable
CREATE TABLE "MobileAuthTicket" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "transferToken" TEXT,
    "redirectPath" TEXT NOT NULL DEFAULT '/teacher',
    "sessionToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileAuthTicket_state_key" ON "MobileAuthTicket"("state");

-- CreateIndex
CREATE UNIQUE INDEX "MobileAuthTicket_transferToken_key" ON "MobileAuthTicket"("transferToken");

-- CreateIndex
CREATE INDEX "MobileAuthTicket_expiresAt_idx" ON "MobileAuthTicket"("expiresAt");
