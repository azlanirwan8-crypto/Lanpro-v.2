const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCodeStart = code.indexOf('{/* Global Avatar Stack Singularity:');
if (oldCodeStart !== -1) {
  const nextDiv = code.indexOf('<div className="flex -space-x-2">', oldCodeStart);
  
  // Find the closing div of this block.
  // The structure is: 
  // <div className="flex -space-x-2">
  //   {(() => { ... return (<>...</>); })()}
  // </div>
  // We can just find '})()}\n                </div>'
  
  const endMarker = '})()}\n                </div>';
  const oldCodeEnd = code.indexOf(endMarker, nextDiv) + endMarker.length;
  
  const toReplace = code.substring(oldCodeStart, oldCodeEnd);
  
  code = code.replace(toReplace, '<HeaderAvatarGroup allUsers={allUsers} currentUserUid={currentUser?.uid || (currentUser as any)?.id} />');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced Avatar stack.");
} else {
  console.log("Could not find start.");
}

