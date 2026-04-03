/**
 * Demo: Dynamic Question Generation by Role
 * 
 * This script demonstrates how questions are now generated dynamically
 * based on the candidate's target role.
 * 
 * Run: node demo-dynamic-questions.js
 */

const {
  getRoleDefinition,
  generateRoleSpecificQuestions,
  getRoleInsights
} = require('./src/aria/questionBank');

const roles = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'DevOps Engineer',
  'UX Designer'
];

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         DYNAMIC QUESTION GENERATION BY ROLE - DEMO              ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

roles.forEach((role, idx) => {
  console.log(`\n📋 ${idx + 1}. ${role.toUpperCase()}`);
  console.log('─'.repeat(60));

  // Get role definition
  const def = getRoleDefinition(role);
  console.log(`   Domain: ${def.domain}`);
  console.log(`   Key Skills: ${def.skills.join(', ')}`);
  console.log(`   Focus Areas: ${def.keywords.join(', ')}`);

  // Generate role-specific questions
  const questions = generateRoleSpecificQuestions(role);
  console.log(`\n   Generated Questions:`);
  questions.forEach((q, i) => {
    console.log(`   Q${i + 1}: ${q.text}`);
    console.log(`       └─ Focus: ${q.skill_focus}`);
  });

  // Get role insights for evaluation
  const insights = getRoleInsights(role);
  console.log(`\n   Evaluation Focus:`);
  insights.evaluationFocus.forEach(f => {
    console.log(`   • ${f}`);
  });
});

console.log('\n\n✅ Dynamic question generation is working!');
console.log('   Questions adapt to any role without hardcoding.\n');
