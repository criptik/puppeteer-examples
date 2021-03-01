/**
 * @name get list of links
 *
 * @desc Scrapes Hacker News for links on the home page and returns the top 10
 */
const puppeteer = require('puppeteer');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log(`started at ${new Date().toLocaleTimeString()}`);

var getSiblings = function (elem) {

    // Setup siblings array and get the first sibling
    var siblings = [];
    var sibling = elem.parentNode.firstChild;

    // Loop through each sibling and push to the array
    while (sibling) {
	if (sibling.nodeType === 1 && sibling !== elem) {
	    siblings.push(sibling);
	}
	sibling = sibling.nextSibling
    }

    return siblings;

};

(async () => {
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    while (true) {
        console.log('reloading scheduler main page');
        await page.goto('https://vaccine.heb.com/scheduler')
        await page.waitForSelector('address')

        
        if (false) {
            let docinfo = JSON.stringify(await page.content(), 2);
            console.log('docinfo: ', docinfo);
        }
        
        // find all the a elements
        let storeObjs = await page.$$eval('a', anchors => {
            return anchors.map(ael => {
                let resobj = {};
                resobj.ainfo = `(${ael.classList.length}), ${ael.textContent})`;
                let elAddrDiv = ael.parentNode.previousSibling;
                let foundAddr = false;
                // skip first child (which is name of store)
                for (let elAddrDivChild of Array.from(elAddrDiv.children).slice(1)) {
                    let infotxt = `-- (${elAddrDivChild.tagName}, ${elAddrDivChild.textContent.replace('\n', ';')}), `;
                    if (elAddrDivChild.tagName === 'ADDRESS') {
                        resobj.addrinfo = infotxt;
                        foundAddr = true;
                    }
                    else {
                        resobj.spotsinfo = infotxt;
                    }    
                    
                }
                return  (foundAddr ? resobj : {});
            }
            );
        })
        // let storeLinkObjs = storeObjs.filter(storeInfo => Array.from(Object.keys(storeInfo)).length != 0);
        let storeLinkObjs = storeObjs.slice(1);
        if (storeLinkObjs.length == 0) {
            console.log('no availability at any stores');
            continue;
        }
        console.log('storeLinkInfo', storeLinkObjs );

        let hrefs = (await page.$$eval('a', anchors => {
            return anchors.map(ael => ael.href);
        })).slice(1);

        // console.log('hrefs: ', hrefs);
        for (let [index, href] of hrefs.entries()) {
            let stobj = storeLinkObjs[index];
            if (false && !stobj.spotsinfo.includes('slots available')) {
                console.log(`${stobj.addrinfo} had only a few slots, skipping`);
                continue;
            }
            console.log(`hitting link for ${stobj.addrinfo} which had ${stobj.spotsinfo}`);
            const page2 = ((false) ? await browser.newPage() : page);

            let timedOut = false;
            await page2.goto(hrefs[0]);
            await page2.waitForSelector('article.slds-card', { visible: true, timeout:8000 }).then(() => {
                console.log('success waiting for slds-card')
            }).catch((res) => {
                console.log('timed out waiting for slds-card')
                timedOut = true;
            })
            if (!timedOut) {
                let page2content = await page2.content();
                if (page2content.includes('There are no available time slots')) {
                    console.log('page had no available time slots');
                }
                else {
                    console.log('success, page had time slots, capturing');
                    await page2.screenshot({ path: 'page2.png' });
                    fs = require('fs');
                    await fs.writeFile('page2content.txt', page2content, (err) => console.log(err));
                    break;
                }
            }
        }
    } // end of while true

    rl.question('Type a key to exit? ', async (answer) => {
        console.log(`Exiting Now... `);
        rl.close();
        await browser.close()
        console.log(`finished at ${new Date().toLocaleTimeString()}`);
    });

})()
