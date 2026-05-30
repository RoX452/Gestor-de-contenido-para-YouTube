import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const replacement = `                            let descSnippet = lvl.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.map((p:any)=>p.text?.content).join('') || '';
                            
                            // Fallback for Shorts lockup view count embedded in title
                            if (viewsVal === 0) {
                                const mm = titleStr.match(/([\\d\\.,]+)\\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones)/i);
                                if (mm) viewsVal = cleanNum(mm[0]);
                            }

                            pageVideos.push({`;

content = content.replace(`                            let descSnippet = lvl.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.map((p:any)=>p.text?.content).join('') || '';
                            pageVideos.push({`, replacement);
fs.writeFileSync('server.ts', content);
console.log("Re-patch complete");
