import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const targetToReplace = `      // Check for ytInitialData across all HTML sources and parse metadata and videos
      const checkAndParsePage = (html: string, pageType: 'videos' | 'shorts' | 'streams') => {`;

const replacement = `      // Check for ytInitialData across all HTML sources and parse metadata and videos
      const checkAndParsePage = async (html: string, pageType: 'videos' | 'shorts' | 'streams') => {`;

content = content.replace(targetToReplace, replacement);

const targetCallsToReplace = `      // Extract videos from all pages
      const vList = checkAndParsePage(videosHtml, 'videos');
      const sList = checkAndParsePage(shortsHtml, 'shorts');
      const stList = checkAndParsePage(streamsHtml, 'streams');`;

const replacementCalls = `      // Extract videos from all pages
      const vList = await checkAndParsePage(videosHtml, 'videos');
      const sList = await checkAndParsePage(shortsHtml, 'shorts');
      const stList = await checkAndParsePage(streamsHtml, 'streams');`;

content = content.replace(targetCallsToReplace, replacementCalls);

// Now we need to insert the continuation logic at the end of checkAndParsePage
const targetReturn = `          return pageVideos;
        } catch (e) {`;

const continuationLogic = `
          // Parse API Key and perform continuations for this tab
          const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
          const apiKey = apiKeyMatch ? apiKeyMatch[1] : null;

          if (apiKey) {
              function findContinuationToken(obj: any): string | null {
                 if (!obj || typeof obj !== 'object') return null;
                 if (obj.continuationEndpoint && obj.continuationEndpoint.continuationCommand && obj.continuationEndpoint.continuationCommand.token) {
                     return obj.continuationEndpoint.continuationCommand.token;
                 }
                 for (const k of Object.keys(obj)) {
                     const res = findContinuationToken(obj[k]);
                     if (res) return res;
                 }
                 return null;
              }
              let token = findContinuationToken(ytData);
              let fetches = 0;
              while (token && fetches < 12) { // up to 12 pages per tab (~360 videos)
                  try {
                      // Avoid throttling
                      await new Promise(r => setTimeout(r, 100));
                      const cRes = await fetch(\`https://www.youtube.com/youtubei/v1/browse?key=\${apiKey}\`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                          body: JSON.stringify({
                             context: { client: { clientName: 'WEB', clientVersion: '2.20240321.01.00' } },
                             continuation: token
                          })
                      });
                      const cData = await cRes.json();
                      const actions = cData.onResponseReceivedActions || [];
                      let items = [];
                      for (const action of actions) {
                          if (action.appendContinuationItemsAction && action.appendContinuationItemsAction.continuationItems) {
                              items.push(...action.appendContinuationItemsAction.continuationItems);
                          }
                      }
                      
                      for (const item of items) {
                         const contentObj = item.richItemRenderer?.content;
                         if (!contentObj) continue;
                         
                         if (contentObj.videoRenderer) {
                            const vStrObj = contentObj.videoRenderer;
                            const videoId = vStrObj.videoId;
                            if (!videoId) continue;
                            const titleStr = vStrObj.title?.runs?.[0]?.text || vStrObj.title?.accessibility?.accessibilityData?.label || "YouTube Video";
                            let viewsVal = 0;
                            const viewsText = vStrObj.viewCountText?.simpleText || vStrObj.viewCountText?.runs?.[0]?.text || "";
                            if (viewsText) {
                               viewsVal = cleanNum(viewsText);
                            } else if (vStrObj.shortViewCountText?.simpleText) {
                               viewsVal = cleanNum(vStrObj.shortViewCountText.simpleText);
                            }
                            const publishedText = rssPubTimes[videoId] || vStrObj.publishedTimeText?.simpleText || "";
                            const durationStr = vStrObj.lengthText?.simpleText || (pageType === 'shorts' ? '0:30' : '8:30');
                            const thumbnails = vStrObj.thumbnail?.thumbnails || [];
                            const thumbnailStr = thumbnails[thumbnails.length - 1]?.url || \`https://i.ytimg.com/vi/\${videoId}/hqdefault.jpg\`;
                            const descSnippet = vStrObj.descriptionSnippet?.runs?.[0]?.text || "";
                            pageVideos.push({
                              id: videoId, title: titleStr, url: \`https://www.youtube.com/watch?v=\${videoId}\`,
                              views: viewsVal, published: publishedText, thumbnail: thumbnailStr, duration: durationStr, description: descSnippet, formatType: pageType
                            });
                         } else if (contentObj.shortsLockupViewModel) {
                            const sl = contentObj.shortsLockupViewModel;
                            let videoId = sl.onTap?.innertubeCommand?.watchEndpoint?.videoId || sl.entityId || "";
                            videoId = videoId.replace('shorts_lockup_prototype_v5_', '').replace('shorts-shelf-item-', '');
                            if (!videoId) continue;
                            const titleStr = sl.overlayMetadata?.accessibilityText || sl.accessibilityText || "YouTube Short";
                            let viewsVal = 0;
                            let viewsText = sl.overlayMetadata?.viewCountText?.simpleText || "";
                            if (!viewsText && sl.accessibilityText) {
                              const mm = sl.accessibilityText.match(/([\d\.,]+)\s*(K|M|B|mil|millon|million|thousand|views|vistas|visualizaciones|de\s+vistas)[^0-9]*$/i);
                              if (mm) viewsText = mm[0];
                              else {
                                const lastNumMatch = sl.accessibilityText.match(/([\d\.,]+)[^\d]*$/);
                                if (lastNumMatch) viewsText = lastNumMatch[0];
                              }
                            }
                            if (viewsText) viewsVal = cleanNum(viewsText);
                            const publishedText = rssPubTimes[videoId] || "";
                            const thumbnails = sl.thumbnail?.thumbnails || [];
                            const thumbnailStr = thumbnails[thumbnails.length - 1]?.url || \`https://i.ytimg.com/vi/\${videoId}/hqdefault.jpg\`;
                            pageVideos.push({
                              id: videoId, title: titleStr, url: \`https://www.youtube.com/watch?v=\${videoId}\`, views: viewsVal, published: publishedText, thumbnail: thumbnailStr, duration: "0:30", description: "YouTube Short", formatType: pageType
                            });
                         } else if (contentObj.lockupViewModel) {
                            const lvl = contentObj.lockupViewModel;
                            const videoId = lvl.contentId;
                            if (!videoId) continue;
                            const titleStr = lvl.metadata?.lockupMetadataViewModel?.title?.content || "YouTube Video";
                            let viewsVal = 0;
                            const mRows = lvl.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
                            let publishedText = rssPubTimes[videoId] || "";
                            for(const row of mRows) {
                               const parts = row.metadataParts || [];
                               for(const part of parts) {
                                  const text = part.text?.content || "";
                                  const txtLower = text.toLowerCase();
                                  if(txtLower.includes("view") || txtLower.includes("vista")) viewsVal = cleanNum(text);
                                  else if(text.match(/\\d+/) && !text.includes(":")) publishedText = text;
                               }
                            }
                            const thumbs = lvl.image?.contentImageViewModel?.image?.sources || [];
                            const thumbnailStr = thumbs[thumbs.length - 1]?.url || \`https://i.ytimg.com/vi/\${videoId}/hqdefault.jpg\`;
                            let durationStr = (pageType === 'shorts') ? '0:30' : '8:30';
                            let descSnippet = lvl.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.map((p:any)=>p.text?.content).join('') || '';
                            pageVideos.push({
                              id: videoId, title: titleStr, url: \`https://www.youtube.com/watch?v=\${videoId}\`, views: viewsVal, published: publishedText, thumbnail: thumbnailStr, duration: durationStr, description: descSnippet, formatType: pageType
                            });
                         }
                      }
                      
                      token = findContinuationToken(cData);
                      fetches++;
                  } catch(ce) {
                     console.log("[Radar Scan] Continuation fetch failed:", ce);
                     break;
                  }
              }
          }

          return pageVideos;
        } catch (e) {`;

content = content.replace(targetReturn, continuationLogic);

fs.writeFileSync('server.ts', content);
console.log("Patcher complete!");
