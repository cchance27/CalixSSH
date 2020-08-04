export type site = {
    name: string, 
    ip: string,
    type: string, 
    pppoes: Array<pppoeSession> | undefined, 
    vlans: Array<vlan> | undefined
}

export type vlan = {
    interface: string,
    vlan: number, 
    mac: string
}

export type pppoeSession = {
  interface: string,
  vlan: number, 
  mac: string, 
  state: string
}

export type rawResult = {
    site: site, 
    raw: string
}