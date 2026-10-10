const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-router',
  'build',
  'fork',
  'useLinking.native.js'
);

if (!fs.existsSync(targetFile)) {
  process.exit(0);
}

let content = fs.readFileSync(targetFile, 'utf8');

const targetSnippet = `                        if (typeof url === 'string') {
                            // If the link were handled, it gets cleared in NavigationContainer
                            onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
                        }
                        return state;
                    });
                }
                else {
                    onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
                }`;

const replacementSnippet = `                        if (typeof url === 'string') {
                            // If the link were handled, it gets cleared in NavigationContainer
                            setTimeout(() => {
                                onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
                            }, 0);
                        }
                        return state;
                    });
                }
                else {
                    setTimeout(() => {
                        onUnhandledLinking((0, extractPathFromURL_1.extractExpoPathFromURL)(prefixes, url));
                    }, 0);
                }`;

if (content.includes(targetSnippet)) {
  content = content.replace(targetSnippet, replacementSnippet);
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully patched expo-router useLinking.native.js');
} else {
  console.log('expo-router useLinking.native.js is already patched or target snippet not found');
}
