/**
 * Basic lead shape for the first stage of the project.
 * Persistence and lead-scoring logic will be added in later stages.
 */
class Lead {
  constructor({
    id,
    name,
    phoneNumber,
    preferredLanguage = 'en',
    companyName = null,
    status = 'new',
    classification = null,
    notes = null,
    createdAt = new Date(),
    updatedAt = new Date()
  } = {}) {
    this.id = id;
    this.name = name;
    this.phoneNumber = phoneNumber;
    this.preferredLanguage = preferredLanguage;
    this.companyName = companyName;
    this.status = status;
    this.classification = classification;
    this.notes = notes;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Lead;
