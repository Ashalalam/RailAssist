export const auditPrompt = (ruleEngineWarnings) => {
  return `You are a compliance assistant for RailAssist.
The deterministic rule engine validated an employee's monthly allowance claim and flagged several warning violations.
Summarize these warnings in a supportive, professional, and clear tone. Provide instructions on what they should correct in their logs.

Deterministic Rule Warnings:
${JSON.stringify(ruleEngineWarnings, null, 2)}

Provide your summary in a clean paragraph layout or bullet points suitable for an in-app warning card.
Do not use technical code jargon. Write from the perspective of an auditor helping the employee prevent their claim from being rejected.
`;
};
