const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-aes-gcm-crypto',
  'android',
  'build.gradle'
);

if (!fs.existsSync(targetFile)) {
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');
let modified = false;

// 1. Remove jcenter() which is completely removed in Gradle 9
if (content.includes('jcenter()')) {
  content = content.replace(/[ \t]*jcenter\(\)\r?\n?/g, '');
  modified = true;
}

// 2. Add namespace "com.reactnativeaesgcmcrypto" for AGP 8+ compatibility
if (!content.includes('namespace')) {
  content = content.replace(
    /android\s*\{/,
    'android {\n  namespace "com.reactnativeaesgcmcrypto"'
  );
  modified = true;
}

// 3. Make sure compileSdkVersion, targetSdkVersion, and minSdkVersion safely resolve in Expo 57
const safeHelper = `def getExtOrIntegerDefault(name) {
  if (rootProject.ext.has(name)) {
    return rootProject.ext.get(name)
  }
  if (name == 'compileSdkVersion' && rootProject.ext.has('compileSdk')) {
    return rootProject.ext.get('compileSdk')
  }
  if (name == 'targetSdkVersion' && rootProject.ext.has('targetSdk')) {
    return rootProject.ext.get('targetSdk')
  }
  if (name == 'minSdkVersion' && rootProject.ext.has('minSdk')) {
    return rootProject.ext.get('minSdk')
  }
  if (name == 'buildToolsVersion' && rootProject.ext.has('buildTools')) {
    return rootProject.ext.get('buildTools')
  }
  def prop = project.hasProperty('AesGcmCrypto_' + name) ? project.properties['AesGcmCrypto_' + name] : null
  if (prop != null) {
    try { return prop.toInteger() } catch (Exception e) { return prop }
  }
  if (name == 'compileSdkVersion' || name == 'targetSdkVersion') return 35
  if (name == 'minSdkVersion') return 24
  if (name == 'buildToolsVersion') return '35.0.0'
  return null
}`;

if (content.includes('def getExtOrIntegerDefault(name) {')) {
  content = content.replace(
    /def getExtOrIntegerDefault\(name\)\s*\{[\s\S]*?\n\}/,
    safeHelper
  );
  modified = true;
}

// 4. Replace hardcoded minSdkVersion 26 with getExtOrIntegerDefault('minSdkVersion')
if (content.includes('minSdkVersion 26')) {
  content = content.replace(
    /minSdkVersion\s+26/,
    "minSdkVersion getExtOrIntegerDefault('minSdkVersion')"
  );
  modified = true;
}

if (modified) {
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully patched react-native-aes-gcm-crypto/android/build.gradle for Gradle 9+ and AGP 8+');
} else {
  console.log('react-native-aes-gcm-crypto/android/build.gradle is already patched');
}
