-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "classroomId" TEXT,
    "classCode" TEXT,
    "teacherEmail" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "actionTaken" TEXT,
    "note" TEXT,
    "device" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Incident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("studentId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Incident_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_uuid_key" ON "Incident"("uuid");

-- CreateIndex
CREATE INDEX "Incident_timestamp_idx" ON "Incident"("timestamp");

-- CreateIndex
CREATE INDEX "Incident_teacherEmail_idx" ON "Incident"("teacherEmail");

-- CreateIndex
CREATE INDEX "Incident_classroomId_idx" ON "Incident"("classroomId");
