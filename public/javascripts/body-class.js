// Required by GOV.UK Frontend: js-enabled lets CSS show JS-dependent elements,
// and govuk-frontend-supported (guarded by the ES module check) unlocks enhanced
// component behaviour. The noModule check is GOV.UK's official browser-support signal.
document.body.className += ' js-enabled' + ('noModule' in HTMLScriptElement.prototype ? ' govuk-frontend-supported' : '');
