import {rawResultToSite, getCalixSshDump, getSites, isOnt, isDsl} from './calix'
import {vlan, pppoeSession, site} from './types'

let algorithms = {
  kex: ['diffie-hellman-group1-sha1'],
  serverHostKey: ['ssh-dss'],
  cipher: ['3des-cbc']
}

async function main() {
  try {
    let sites = getSites()

    // Generate an array of promises fetching the calix ssh results for each site
    let queries = sites.map((site) => getCalixSshDump(site, 22, 'admin', algorithms, true))

    // Wait for all the promises to finish
    let resultRaw = await Promise.all(queries)

    // Update our sites by having the raw results cleaned up
    sites = resultRaw.map(rr => rawResultToSite(rr))

    let vlanCount: number = 0
    sites.forEach((site: site) => { if (site.vlans) { site.vlans.forEach((_: vlan) => vlanCount += 1) } })
    
    let pppoeCount: number = 0;
    sites.forEach((site: site) => { if (site.pppoes) { site.pppoes.forEach((_: pppoeSession) => pppoeCount += 1) } })
    let total = pppoeCount + vlanCount

    console.log()
    console.log('Main::PPPoE:' + pppoeCount)
    console.log('Main::NonPPPOE:' + vlanCount)
    console.log('Main::Total:' + total)

    vlanCount = 0
    sites.forEach((site: site) => { if (site.vlans) { site.vlans.filter(v => isOnt(v)).forEach((_: vlan) => vlanCount += 1) } })
    pppoeCount = 0
    sites.forEach((site: site) => { if (site.pppoes) { site.pppoes.filter(v => isOnt(v)).forEach((_: pppoeSession) => pppoeCount += 1) } })
    total = pppoeCount + vlanCount

    console.log()
    console.log('Main::GPON::PPPoE:' + pppoeCount)
    console.log('Main::GPON::NonPPPOE:' + vlanCount)
    console.log('Main::GPON::Total:' + total)
    
    vlanCount = 0
    sites.forEach((site: site) => { if (site.vlans) { site.vlans.filter(v => isDsl(v)).forEach((_: vlan) => vlanCount += 1) } })
    pppoeCount = 0
    sites.forEach((site: site) => { if (site.pppoes) { site.pppoes.filter(v => isDsl(v)).forEach((_: pppoeSession) => pppoeCount += 1) } })
    total = pppoeCount + vlanCount

    console.log()
    console.log('Main::VDSL::PPPoE:' + pppoeCount)
    console.log('Main::VDSL::NonPPPOE:' + vlanCount)
    console.log('Main::VDSL::Total:' + total)

    console.log()

    console.log('Main::Complete')
  } catch (err) {
    console.log("Main::ERROR::" + err)
  }
}

main()