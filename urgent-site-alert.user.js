// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.30.26
// @description  In-place notification for urgency: 1P Threshold - Yard Capacity
// @author       monimag
// @match        https://aap-na.corp.amazon.com/*
// @icon         https://www.google.com/s2/favicons?domain=amazon.com
// @updateURL    https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @downloadURL  https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        urgentSites: ['ACY9', 'ATL2', 'AUS2', 'AUS3', 'BDU5', 'BOI2', 'BOS3', 'BWI4', 'GEU3', 'HGR3', 'HGR5', 'HGR6', 'HIA1', 'HLO3', 'HOU9', 'HSE1', 'ILG1', 'JFK8', 'LBB5', 'MCI5', 'MDT4', 'MDT9', 'MGE9', 'PDX9', 'PNE5', 'ORH3', 'ORH5', 'QZZ1', 'RDU1', 'RIC4', 'SAN3', 'SAT3', 'SBD6', 'SWF1', 'TEB9', 'TUS5', 'TYS1', 'ZACY'],
        urgentPrefixes: [],
        checkInterval: 500,
        maxRetries: 20,
        debug: true
    };

    function log(message, data = null) {
        if (CONFIG.debug) {
            console.log(`[🚨 Urgent Alert] ${message}`, data || '');
        }
    }

    function isTrailerPage() {
        log('🔍 Checking if this is a Trailer page...');
        const rows = document.querySelectorAll('tr.css-xlf10u');
        for (let row of rows) {
            const cells = row.querySelectorAll('th, td');
            for (let i = 0; i < cells.length - 1; i++) {
                const headerText = cells[i].textContent.trim();
                const valueText = cells[i + 1].textContent.trim();
                if (headerText === 'Asset Type' && valueText === 'Trailer') {
                    log('✅ Confirmed: This is a Trailer page (found in table)');
                    return true;
                }
            }
        }
        log('❌ Not a Trailer page');
        return false;
    }

    function getLastYardLocation() {
        log('Searching for Last Yard Location...');
        const allElements = Array.from(document.querySelectorAll('p, span, div'));
        const locationElement = allElements.find(el => {
            const text = el.textContent.trim();
            return /^[A-Z]{3,4}[0-9A-Z]*\s*-\s*[A-Z0-9]+/.test(text);
        });

        if (locationElement) {
            const text = locationElement.textContent.trim();
            log('✅ Found location via pattern matching:', text);
            return text;
        }

        const labels = Array.from(document.querySelectorAll('p, span, div, label'));
        const locationLabel = labels.find(el => el.textContent.trim() === 'Last Yard Location');

        if (locationLabel) {
            let valueElement = locationLabel.nextElementSibling;
            if (!valueElement) {
                valueElement = locationLabel.parentElement?.nextElementSibling;
            }
            if (!valueElement) {
                const parent = locationLabel.parentElement;
                const allP = parent?.querySelectorAll('p');
                if (allP && allP.length > 1) {
                    valueElement = allP[1];
                }
            }

            if (valueElement) {
                const text = valueElement.textContent.trim();
                log('✅ Found location via label strategy:', text);
                return text;
            }
        }

        const serviceOverview = Array.from(document.querySelectorAll('div')).find(el =>
            el.textContent.includes('Last Yard Location')
        );

        if (serviceOverview) {
            const paragraphs = serviceOverview.querySelectorAll('p');
            for (let p of paragraphs) {
                const text = p.textContent.trim();
                if (/^[A-Z]{3,4}[0-9A-Z]*/.test(text)) {
                    log('✅ Found location in Service Overview:', text);
                    return text;
                }
            }
        }

        log('❌ Could not find Last Yard Location');
        return null;
    }

    function isUnassignedWorkOrder() {
        const allElements = document.querySelectorAll('span, p, div');
        for (let el of allElements) {
            if (el.textContent.trim() === 'Unassigned') {
                log('✅ Work order is unassigned');
                return true;
            }
        }
        log('Work order is NOT unassigned');
        return false;
    }

    function extractSiteCode(locationText) {
        if (!locationText) return null;
        const match = locationText.trim().match(/^([A-Z]{3,4}[0-9A-Z]*)/);
        const code = match ? match[1] : null;
        log('Extracted site code:', code);
        return code;
    }

    function isUrgentSite(siteCode) {
        if (!siteCode) return false;

        if (CONFIG.urgentSites.includes(siteCode)) {
            log(`🚨 URGENT: Exact match found - ${siteCode}`);
            return true;
        }

        const matchedPrefix = CONFIG.urgentPrefixes.find(prefix =>
            siteCode.startsWith(prefix)
        );

        if (matchedPrefix) {
            log(`🚨 URGENT: Prefix match found - ${siteCode} starts with ${matchedPrefix}`);
            return true;
        }

        log(`✅ Not urgent: ${siteCode}`);
        return false;
    }

    function findVendorSection() {
        log('Searching for Vendor section...');

        const allParagraphs = Array.from(document.querySelectorAll('p.css-86vfqe'));
        const unassignedInVendor = allParagraphs.find(p => {
            const text = p.textContent.trim();
            if (text === 'Unassigned') {
                const parent = p.closest('div.css-1xz1o3r');
                if (parent) {
                    const hasEditButton = parent.querySelector('button.css-10ebv51');
                    if (hasEditButton) {
                        log('✅ Found Vendor section via Unassigned + Edit button');
                        return true;
                    }
                }
            }
            return false;
        });

        if (unassignedInVendor) {
            return unassignedInVendor.closest('tr.css-xlf10u');
        }

        const allText = Array.from(document.querySelectorAll('*'));
        const vendorHeader = allText.find(el => {
            const text = el.textContent.trim();
            return text === 'Vendor' && el.tagName.toLowerCase() !== 'button';
        });

        if (vendorHeader) {
            log('✅ Found "Vendor" header text');
            let current = vendorHeader;
            for (let i = 0; i < 10; i++) {
                current = current.parentElement;
                if (!current) break;

                const unassignedRow = current.querySelector('tr.css-xlf10u');
                if (unassignedRow) {
                    const hasUnassigned = unassignedRow.textContent.includes('Unassigned');
                    if (hasUnassigned) {
                        log('✅ Found Vendor section via header navigation');
                        return unassignedRow;
                    }
                }
            }
        }

        const serviceOverviewHeaders = Array.from(document.querySelectorAll('h2, h3, div'));
        const serviceOverview = serviceOverviewHeaders.find(el =>
            el.textContent.trim() === 'Service Overview'
        );

        if (serviceOverview) {
            log('Found Service Overview section');
            const container = serviceOverview.closest('div');
            if (container) {
                const vendorRows = container.querySelectorAll('tr.css-xlf10u');
                for (let row of vendorRows) {
                    if (row.textContent.includes('Unassigned') &&
                        row.querySelector('button.css-10ebv51')) {
                        log('✅ Found Vendor section in Service Overview');
                        return row;
                    }
                }
            }
        }

        log('❌ Could not find Vendor section');
        return null;
    }

    function showInPlaceNotification(siteCode) {
        if (document.getElementById('urgent-site-notification')) {
            log('Notification already displayed');
            return;
        }

        if (!isTrailerPage()) {
            log('⚠️ Not a Trailer work order - skipping notification');
            return;
        }

        log(`🚨 Showing in-place notification for ${siteCode}`);

        const vendorRow = findVendorSection();

        if (!vendorRow) {
            log('❌ Could not find Vendor section, retrying...');
            setTimeout(() => showInPlaceNotification(siteCode), 1000);
            return;
        }

        insertNotification(vendorRow, siteCode);
    }

    function insertNotification(vendorRow, siteCode) {
        const notificationRow = document.createElement('tr');
        notificationRow.id = 'urgent-site-notification';
        notificationRow.className = 'css-xlf10u';

        const notificationCell = document.createElement('td');
        notificationCell.setAttribute('colspan', '2');
        notificationCell.style.cssText = 'padding: 0;';

        const notification = document.createElement('div');
        notification.style.cssText = `
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
            color: white;
            padding: 16px 20px;
            margin: 8px 0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(238, 90, 111, 0.4);
            border-left: 6px solid #c0392b;
            animation: slideInNotification 0.4s ease-out, pulseNotification 2s infinite;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px; animation: rotateWarning 2s infinite; flex-shrink: 0;">⚠️</div>
                <div style="flex: 1;">
                    <div style="font-size: 18px; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">🚨 URGENT TRAILER WORK ORDER - ACTION REQUIRED</div>
                    <div style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">${siteCode} - 1P THRESHOLD SITE - YARD CAPACITY - ALL MINOR REPAIRS SUCH AS: TIRE(S), ELECTRICAL (LIGHTS, 7 WAY), AND MUDFLAP(S) WORK ORDERS AT THE FOLLOWING SITES ARE URGENT FOR TODAY. NO URGENCY VALIDATOR APPROVAL NEEDED, MARK URGENT AND LEAVE COMMENT: SITE IS OVER 1P DAMAGED THRESHOLD, ASSIGNING URGENT.</div>
                    <div style="font-size: 13px; opacity: 0.95; line-height: 1.4;">This site requires immediate attention. <strong>Make sure to comment the need of urgency.</strong></div>
                </div>
            </div>
        `;

        if (!document.getElementById('urgent-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'urgent-notification-styles';
            style.textContent = `
                @keyframes slideInNotification {
                    from { transform: translateX(-100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes pulseNotification {
                    0%, 100% { box-shadow: 0 4px 12px rgba(238, 90, 111, 0.4); }
                    50% { box-shadow: 0 4px 20px rgba(238, 90, 111, 0.7); }
                }
                @keyframes rotateWarning {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
            `;
            document.head.appendChild(style);
        }

        notificationCell.appendChild(notification);
        notificationRow.appendChild(notificationCell);
        vendorRow.parentElement.insertBefore(notificationRow, vendorRow.nextSibling);

        log('✅ In-place notification displayed successfully in Vendor section');
    }

    function removeNotification() {
        const notification = document.getElementById('urgent-site-notification');
        if (notification) {
            notification.style.animation = 'slideInNotification 0.3s ease-in reverse';
            setTimeout(() => notification.remove(), 300);
            log('✅ Notification removed (work order assigned)');
        }
    }

    let lastCheckedLocation = null;
    let checkAttempts = 0;
    let hasTriggered = false;

    function checkForUrgentSite() {
        log(`--- Check attempt ${checkAttempts + 1} ---`);

        if (!isUnassignedWorkOrder()) {
            if (hasTriggered) {
                removeNotification();
                hasTriggered = false;
            }
            log('Not an unassigned work order, skipping');
            return;
        }

        if (hasTriggered) {
            log('Already triggered for this work order');
            return;
        }

        const locationText = getLastYardLocation();
        if (!locationText) {
            checkAttempts++;
            if (checkAttempts < CONFIG.maxRetries) {
                log(`Retrying... (${checkAttempts}/${CONFIG.maxRetries})`);
                setTimeout(checkForUrgentSite, CONFIG.checkInterval);
            } else {
                log('❌ Max retries reached, giving up');
            }
            return;
        }

        checkAttempts = 0;

        if (locationText === lastCheckedLocation) {
            log('Same location as last check, skipping');
            return;
        }
        lastCheckedLocation = locationText;

        const siteCode = extractSiteCode(locationText);

        if (isUrgentSite(siteCode)) {
            log(`🚨🚨🚨 URGENT SITE DETECTED: ${siteCode} 🚨🚨🚨`);
            hasTriggered = true;
            setTimeout(() => showInPlaceNotification(siteCode), 500);
        }
    }

    function init() {
        log('=== Script Initialized (v12.7.0 - Trailer Detection) ===');
        log('Urgent Sites (Exact Match):', CONFIG.urgentSites);
        log('Urgent Prefixes:', CONFIG.urgentPrefixes);
        log('Total Monitoring:', `${CONFIG.urgentSites.length} exact + ${CONFIG.urgentPrefixes.length} prefix patterns`);
        log('⚠️ TRAILER WORK ORDERS ONLY');

        setTimeout(checkForUrgentSite, 1000);

        const observer = new MutationObserver((mutations) => {
            const significantChange = mutations.some(m =>
                m.addedNodes.length > 5 || m.removedNodes.length > 5
            );

            if (significantChange) {
                log('Significant DOM change detected');
                hasTriggered = false;
                lastCheckedLocation = null;
                checkAttempts = 0;
            }

            checkForUrgentSite();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver active');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
