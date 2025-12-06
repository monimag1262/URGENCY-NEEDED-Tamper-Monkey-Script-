// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.0.0                                                                                                                                      #UPDATE THIS PART, IT WILL INITIATE THE UPDATE FOR OTHERS WHEN THEY PRESS THE AAP BUTTON   
// @description  Notificate for Urgency withing Site and Reason 
// @author       monimag
// @match        https://aap-na.corp.amazon.com/*
// @icon         https://www.google.com/s2/favicons?domain=amazon.com
// @updateURL    https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @downloadURL  https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Define urgent sites
    const URGENT_SITES_EXACT = ['STL5', 'YVR2', 'RDF2', 'TPA1'];
    const URGENT_SITES_PREFIX = ['RDU', 'MCO', 'FTW', 'BFI', 'DCA'];
    const URGENT_COMMENT = "Work Order is Urgent Due to Site being over 1P Threshold";

    let popupShown = false; // Prevent duplicate popups

    // Function to check if a site is urgent
    function isUrgentSite(siteText) {
        if (!siteText) return false;
        
        // Extract site code (e.g., "RDU1" from "RDU1 - PS552 (ParkingSlip)")
        const siteMatch = siteText.match(/^([A-Z0-9]+)/);
        if (!siteMatch) return false;
        
        const siteCode = siteMatch[1];
        
        // Check exact matches
        if (URGENT_SITES_EXACT.includes(siteCode)) return true;
        
        // Check prefix matches
        for (const prefix of URGENT_SITES_PREFIX) {
            if (siteCode.startsWith(prefix)) return true;
        }
        
        return false;
    }

    // Function to check if work order is unassigned
    function isUnassigned() {
        const unassignedElements = document.querySelectorAll('td.css-18tzy6q span');
        for (const element of unassignedElements) {
            if (element.textContent.trim() === 'Unassigned') {
                return true;
            }
        }
        return false;
    }

    // Function to get Last Yard Location
    function getLastYardLocation() {
        const locationElement = document.querySelector('p.css-86vfqe[mdn-text]');
        return locationElement ? locationElement.textContent.trim() : null;
    }

    // Function to fill comment section
    function fillComment() {
        const commentBox = document.querySelector('textarea#my-input.css-hg5e51, textarea[placeholder="Enter Comments Here"]');
        if (commentBox && !commentBox.value.includes(URGENT_COMMENT)) {
            commentBox.value = URGENT_COMMENT;
            // Trigger events to ensure the change is registered
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
            commentBox.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('Comment added:', URGENT_COMMENT);
        }
    }

    // Function to create and show popup
    function showUrgentPopup() {
        // Check if popup already exists or was already shown
        if (document.getElementById('urgent-site-popup') || popupShown) return;
        
        popupShown = true;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'urgent-site-popup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            animation: fadeIn 0.3s;
        `;

        // Create popup box
        const popup = document.createElement('div');
        popup.style.cssText = `
            background-color: #fff;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            max-width: 550px;
            text-align: center;
            border: 4px solid #ff0000;
            animation: slideIn 0.4s;
        `;

        // Create content
        popup.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #ff0000; margin: 0 0 20px 0; font-size: 28px; font-weight: bold;">
                URGENT SITE ALERT
            </h2>
            <p style="font-size: 20px; margin: 20px 0; color: #333; font-weight: bold;">
                SITE IS OVER 1P THRESHOLD
            </p>
            <p style="font-size: 16px; margin: 20px 0; color: #666; line-height: 1.5;">
                Immediate action is required for this work order.<br>
                The comment section will be auto-filled with the urgency notice.
            </p>
            <button id="acknowledge-btn" style="
                background-color: #ff6600;
                color: white;
                border: none;
                padding: 15px 40px;
                font-size: 18px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 20px;
                transition: all 0.3s;
            ">I Acknowledge and Understand</button>
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: scale(0.8) translateY(-50px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Add button hover effect
        const btn = document.getElementById('acknowledge-btn');
        btn.addEventListener('mouseover', () => {
            btn.style.backgroundColor = '#ff8533';
            btn.style.transform = 'scale(1.05)';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.backgroundColor = '#ff6600';
            btn.style.transform = 'scale(1)';
        });

        // Handle acknowledgment
        btn.addEventListener('click', () => {
            fillComment();
            overlay.style.animation = 'fadeOut 0.3s';
            setTimeout(() => overlay.remove(), 300);
        });

        // Add fadeOut animation
        style.textContent += `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
    }

    // Main check function
    function checkForUrgentSite() {
        if (!isUnassigned()) {
            popupShown = false; // Reset if not on unassigned page
            return;
        }

        const location = getLastYardLocation();
        if (!location) return;

        if (isUrgentSite(location)) {
            console.log('Urgent site detected:', location);
            showUrgentPopup();
        }
    }

    // Run check immediately
    setTimeout(checkForUrgentSite, 500);

    // Set up MutationObserver to watch for DOM changes
    const observer = new MutationObserver((mutations) => {
        checkForUrgentSite();
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Also check periodically (as backup)
    setInterval(checkForUrgentSite, 1000);

    console.log('Amazon Relay Urgent Site Alert script loaded!');

})();
