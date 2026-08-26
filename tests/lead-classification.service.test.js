const assert = require('node:assert/strict');
const { classifyLead } = require('../src/services/lead-classification.service');

const hotLead = classifyLead({
  transcript: 'I sell clothes online. My budget is 50000 and I need the website in 1 month. Can you start next week? Please send me the quotation.',
  leadData: {
    businessType: 'clothes',
    productCount: 100,
    budget: 50000,
    timeline: '1 month',
    features: ['payment gateway', 'admin panel']
  }
});

assert.equal(hotLead.classification, 'HOT');
assert.equal(hotLead.confidence, 0.9);
assert.equal(hotLead.barrier, null);

const warmLead = classifyLead({
  transcript: 'I sell handmade jewellery and need an online store, but my budget is low right now. I may discuss it with my partner.',
  leadData: {
    businessType: 'handmade jewellery',
    productCount: 30,
    budget: null,
    timeline: null,
    features: ['payment gateway']
  }
});

assert.equal(warmLead.classification, 'WARM');
assert.match(warmLead.barrier, /budget|decision maker/);

const coldLead = classifyLead({
  transcript: 'I am just checking. No plan right now, just wanted to know the price.',
  leadData: {
    businessType: null,
    productCount: null,
    budget: null,
    timeline: null,
    features: []
  }
});

assert.equal(coldLead.classification, 'COLD');

const ambiguousLead = classifyLead({
  transcript: 'I have a small bakery and am thinking about selling online someday.',
  leadData: {
    businessType: 'bakery',
    productCount: null,
    budget: null,
    timeline: null,
    features: []
  }
});

assert.equal(ambiguousLead.classification, 'WARM');
assert.equal(ambiguousLead.confidence, 0.55);

const hinglishLead = classifyLead({
  transcript: 'Main clothes bechta hoon. Budget 50000 hai aur website jaldi chahiye. Aap kab shuru kar sakte ho? Quotation bhej dijiye.',
  leadData: {
    businessType: 'clothes',
    productCount: 80,
    budget: 50000,
    timeline: 'soon',
    features: ['payment gateway']
  }
});

assert.equal(hinglishLead.classification, 'HOT');

console.log('Lead classification service tests passed.');
