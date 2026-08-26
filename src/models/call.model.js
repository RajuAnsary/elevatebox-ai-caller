/**
 * Basic call shape for the first stage of the project.
 * Provider identifiers, transcripts, and outcomes will be populated later.
 */
class Call {
  constructor({
    id,
    leadId,
    status = 'queued',
    providerCallId = null,
    transcript = [],
    startedAt = null,
    endedAt = null,
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.id = id;
    this.leadId = leadId;
    this.status = status;
    this.providerCallId = providerCallId;
    this.transcript = transcript;
    this.startedAt = startedAt;
    this.endedAt = endedAt;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Call;
