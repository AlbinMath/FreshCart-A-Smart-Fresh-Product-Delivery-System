#!/usr/bin/env node

// Health check script for test environment
const fs = require('fs');
const path = require('path');

console.log('🔍 FreshCart Test Environment Health Check');
console.log('==========================================');

let allGood = true;

// Check Node.js version
const nodeVersion = process.version;
console.log(`📋 Node.js version: ${nodeVersion}`);
if (parseInt(nodeVersion.slice(1)) < 18) {
  console.log('❌ Node.js 18+ required');
  allGood = false;
} else {
  console.log('✅ Node.js version OK');
}

// Check if package.json exists
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ package.json found');
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (pkg.devDependencies['@playwright/test']) {
      console.log('✅ Playwright dependency found');
    } else {
      console.log('❌ Playwright dependency missing');
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Error reading package.json');
    allGood = false;
  }
} else {
  console.log('❌ package.json not found');
  allGood = false;
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules found');
} else {
  console.log('⚠️  node_modules not found - run "npm install"');
}

// Check if test files exist
const testFiles = [
  'e2e/smoke.spec.js',
  'e2e/auth.spec.js',
  'e2e/products.spec.js',
  'e2e/admin.spec.js',
  'e2e/delivery.spec.js'
];

let testFilesFound = 0;
testFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    testFilesFound++;
  }
});

console.log(`✅ ${testFilesFound}/${testFiles.length} test files found`);

// Check Playwright config
const configPath = path.join(__dirname, 'playwright.config.js');
if (fs.existsSync(configPath)) {
  console.log('✅ Playwright config found');
} else {
  console.log('❌ Playwright config missing');
  allGood = false;
}

// Check page objects
const pageObjectsPath = path.join(__dirname, 'page-objects');
if (fs.existsSync(pageObjectsPath)) {
  const pageObjects = fs.readdirSync(pageObjectsPath).filter(f => f.endsWith('.js'));
  console.log(`✅ ${pageObjects.length} page objects found`);
} else {
  console.log('❌ Page objects directory missing');
  allGood = false;
}

// Check utils
const utilsPath = path.join(__dirname, 'utils');
if (fs.existsSync(utilsPath)) {
  const utils = fs.readdirSync(utilsPath).filter(f => f.endsWith('.js'));
  console.log(`✅ ${utils.length} utility files found`);
} else {
  console.log('❌ Utils directory missing');
  allGood = false;
}

// Check if Playwright browsers are installed
const playwrightPath = path.join(__dirname, 'node_modules', '.bin', 'playwright');
const playwrightCmd = process.platform === 'win32' ? playwrightPath + '.cmd' : playwrightPath;

if (fs.existsSync(playwrightCmd)) {
  console.log('✅ Playwright CLI found');
} else {
  console.log('⚠️  Playwright CLI not found - browsers may not be installed');
}

// Summary
console.log('\n🎯 Summary:');
if (allGood) {
  console.log('✅ All critical components are present');
  console.log('🚀 You can run tests with: npm test');
} else {
  console.log('❌ Some issues found - please fix them before running tests');
}

console.log('\n📚 Quick commands:');
console.log('  npm install              - Install dependencies');
console.log('  npx playwright install   - Install browsers');
console.log('  npm run test:smoke       - Run smoke tests');
console.log('  npm run test:headed      - Run with visible browser');

process.exit(allGood ? 0 : 1);