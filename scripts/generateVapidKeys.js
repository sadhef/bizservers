const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('Generating VAPID keys for push notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('');

// Update .env file
const envPath = path.join(__dirname, '..', '.env');

try {
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    
    // Remove existing VAPID keys
    envContent = envContent.replace(/^VAPID_PUBLIC_KEY=.*$/gm, '');
    envContent = envContent.replace(/^VAPID_PRIVATE_KEY=.*$/gm, '');
    envContent = envContent.replace(/\n\n+/g, '\n');
  }
  
  // Add new VAPID keys
  envContent += `\n# Push Notification Keys\n`;
  envContent += `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`;
  envContent += `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}\n`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('Environment file updated successfully!');
  
} catch (error) {
  console.log('Could not update .env file. Please add the keys manually.');
}


module.exports = vapidKeys;