const fs = require('fs');

let content = fs.readFileSync('src/features/dashboard/index.tsx', 'utf8');

// The new layout string we inject was:
// {/* 1. BARIS PERTAMA (TATA LETAK SATU BARIS) */}

// We need to undo the w-[35%] and w-[65%] and the flex-row 
const startFirstRow = content.indexOf(`{/* 1. BARIS PERTAMA (TATA LETAK SATU BARIS) */}`);
const endFirstRow = content.indexOf(`{/* 2. BARIS KEDUA (TABEL BAWAH) */}`);

if (startFirstRow !== -1 && endFirstRow !== -1) {
  let innerBlock = content.substring(startFirstRow, endFirstRow);

  // Extract Waterfall block
  let waterfallStart = innerBlock.indexOf(`/* Waterfall SDLC Phase Gate Board */`);
  let waterfallEnd = innerBlock.indexOf(`{/* Key Meta Stats Row */}`);
  let waterfallBlock = innerBlock.substring(waterfallStart, waterfallEnd);
  // remove the <div className="w-[35%]"> wrapper
  waterfallBlock = waterfallBlock.replace(`<div className="w-[35%]">\n                  `, '').replace(/\n                <\/div>\n[ \t]*$/, '');

  // Extract Stats Grid block
  let statsStart = innerBlock.indexOf(`{/* Key Meta Stats Row */}`);
  let statsBlock = innerBlock.substring(statsStart);
  // remove the flex row end div
  statsBlock = statsBlock.replace(/<\/div>\n\n            \n            <\/div>\n /, '</div>\n');
  statsBlock = statsBlock.replace(`<div className="flex-1 grid grid-cols-4 gap-4 w-[65%]">`, `<div className={styles.statsGrid}>`);

  // Recover the name
  waterfallBlock = waterfallBlock.replace(
    `<ShieldAlert className="w-5 h-5 text-amber-400" /> METRIX SCORING PENENTUAN METODOLOGI (SDLC BNI)`,
    `<ShieldAlert className="w-5 h-5 text-amber-400" /> BNI`
  ).replace(
    `METRIX SCORING PENENTUAN METODOLOGI (SDLC BNI)\n                          SDLC Milestone Gates`,
    `BNI\n                          SDLC Milestone Gates`
  );

  let replacement = `${statsBlock}
            <div className={styles.mainSection}>
              <div className={styles.majorArea}>
                {/* Hybrid Phase/Sprint Dashboard Section (Agile & Waterfall together) */}
                <React.Fragment>
                  ${waterfallBlock}`;

  // Replace back the whole section
  const mainEndStr = `<div className="w-full flex flex-col gap-8 items-start">\n              <div className={styles.majorArea}>\n                {/* Hybrid Phase/Sprint Dashboard Section (Agile & Waterfall together) */}\n                <React.Fragment>\n                  \n\n                  {/* Active Sprint Section for Agile */}`;
  
  let newContent = content.substring(0, startFirstRow) + replacement + `\n                  {/* Active Sprint Section for Agile */}` + content.substring(content.indexOf(`{/* Active Sprint Section for Agile */}`, endFirstRow) + `{/* Active Sprint Section for Agile */}`.length);

  fs.writeFileSync('src/features/dashboard/index.tsx', newContent);
  console.log('Restored');
} else {
  console.log('Could not find markers');
}
