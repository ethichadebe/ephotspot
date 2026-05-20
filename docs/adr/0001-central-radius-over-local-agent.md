# Central RADIUS over local agent

The original spec (Issue #1) described a local agent — a Node.js process running on-prem at each operator site, polling the cloud for commands and talking directly to the local MikroTik router. That design was deliberately replaced with a central FreeRADIUS server that all MikroTik nodes authenticate against.

The reason: EPHotspot's core value proposition is one data balance that works at any operator's hotspot. A local-agent design makes that impossible — the user's balance would be scoped to whichever site they registered at. Central RADIUS means every MikroTik router is a dumb enforcement point; all account state lives in one place, so a user who buys data in Johannesburg can spend it in Cape Town.

The trade-off accepted: if the central RADIUS server or the internet connection at an operator site goes down, new logins at that site fail (existing authenticated sessions survive). The local-agent design would have kept a site working through cloud outages. This is an acceptable trade-off for a roaming-first platform.
