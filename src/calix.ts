import { pppoeSession, vlan, site, rawResult } from 'types';
import { sites } from 'config';

let NodeSSH = require('node-ssh')

export async function getCalixSshDump(host:site, port: number, password:string , algorithms: any, logssh: boolean = false): Promise<rawResult> {
  try {
    let ssh = new NodeSSH()
    await ssh.connect({ host: host.ip, port: port, username: host.type, password: password, algorithms: algorithms })

    process.stdout.write(`Calix::getCalixSshDump::${host.name}\n`)
    let shell = await ssh.requestShell()
    let chunks: Array<Uint8Array> = [];
    
    shell.write('set session alarm-notif disabled\n')
    shell.write('set session event-notif disabled\n')
    shell.write('set session tca-notif disabled\n')
    shell.write('set session pager disabled\n');
    shell.write('show pppoe sessions\n')
    shell.write('show mac\n')
    shell.write('exit\n')

    for await (const chunk of shell) {
      chunks.push(chunk)
    }

    await shell.end()
    
    // If we are set to log then write this to a dump file
    if (logssh) {

    }

    return {site: host, raw: Buffer.concat(chunks).toString()}
  } catch(err) {
    process.stdout.write(`Calix::getCalixSshDump::${host.name}:ERROR-${err}\n`)
    return {site: host, raw: ""}
  }
}

export function rawResultToSite(rr:rawResult): site {
  let {site, raw} = rr
  let indexPPP = raw.indexOf("SID")
  let indexPPPEnd = raw.indexOf("PPPoE sessions found.")
  let indexVLAN = raw.indexOf("VLAN MAC Address")
  let indexVLANEnd = raw.indexOf("MAC addresses found.")

  if (indexVLAN> 0 && indexPPP > 0 && indexPPPEnd > 0 && indexVLANEnd > 0) {
    // We've got valid results

    // Crop out the sessions, cleanup extra whitespace, and split into rows
    let sessions = raw.substring(indexPPP, indexPPPEnd).replace(/ +/g, ' ').split('\r\n')

    // Remove the header lines, and the total/blank line and end
    sessions = sessions.slice(2, sessions.length - 2) 
//TODO: EMPTY PPPOE OR VLAN THOUGH VLAN LESS USEFULL
    // Cleanup the plain text rows to clean objects
    let cleanSessions = sessions.map((row) => {
      let vals = row.split(" ")
      return {
        interface: vals[2].trim(),
        vlan: Number(vals[3].trim()), 
        mac: vals[4].replace(/:/g, "").trim(), 
        state: vals[6].trim()
      }
    })
    
    // Crop out the sessions, cleanup extra whitespace, and split into rows
    let vlans = raw.substring(indexVLAN, indexVLANEnd).replace(/ +/g, ' ').split('\r\n')

    // Remove the header lines, and the total/blank line and end
    vlans = vlans.slice(2, vlans.length - 2)

    // Cleanup the plain text rows to clean objects
    let cleanVlans = vlans.map((row) => {
      let vals = row.split(" ")
      return {
        vlan: Number(vals[0].trim()), 
        mac: vals[1].replace(/:/g, "").trim(), 
        interface: vals[3].trim()
      }
    })

    // Save the ppoes but filter for only active sessions
    site.pppoes = customerSessionFilter(cleanSessions)

    // Save the vlans but filter them first to remove the ones we're using 
    site.vlans = customerVlansFilter(cleanVlans)
    return site
  } else {
      throw `rawResultToSite::${site.name}-Missing Sessions or Vlans\n\n${raw}`
  }
}

function customerVlansFilter(vlans: Array<vlan>): Array<vlan> {
  return vlans.filter((v: vlan) => 
      v.vlan !== 1 && 
      v.vlan !== 998 && 
      (v.vlan < 2000 || v.vlan > 2999) && v.vlan !== 20 && 
      v.interface.indexOf('g') === -1 && 
      v.interface.indexOf('LAG') === -1
    )
}

function customerSessionFilter(pppoes: Array<pppoeSession>): Array<pppoeSession> {
  return pppoes.filter((p: pppoeSession) => p.state === "session")
}

export function getSites(): Array<site> {
  return sites;
}

export function isOnt(i: pppoeSession | vlan) {
  return i.interface.indexOf("v") === -1 
}

export function isDsl(i: pppoeSession | vlan) {
  return i.interface.indexOf("v") > -1 
}