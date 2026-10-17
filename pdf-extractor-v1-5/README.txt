PDF Extractor — source package — version 1.6.0

Install locally:
1. Extract this folder.
2. Open brave://extensions or chrome://extensions.
3. Enable Developer mode.
4. Choose Load unpacked and select this folder.

Version 1.6.0 adds website-matching Open PDF and Download actions to assignment cards when a direct PDF URL is exposed or detected after opening the assignment. Existing popup, local PDF history, and support link are preserved.

This build is intentionally configured for a specific site and document host. The hostnames remain in manifest.json and the detection code because they are required for the extension to work; user-facing branding and descriptions are generic.

Review STORE_LISTING.txt and PRIVACY_POLICY_DRAFT.md before publishing.

Support the developer
---------------------
The popup includes an optional “Support YKDevLab” link to https://buymeatea.online/ykdevlab. It opens the support page in a new tab; the Buy Me a Tea remote overlay script is not loaded inside the extension popup.
