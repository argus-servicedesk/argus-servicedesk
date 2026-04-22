// ═══════════════════════════════════════════════════════════
// LinkedEye ITSM — Hardware Metrics Service (Prometheus)
// ═══════════════════════════════════════════════════════════

const axios = require('axios');

const PROM_URL = process.env.PROMETHEUS_URL || 'http://prometheus-svc.fs-linkedeye.svc.cluster.local:8080';

async function promQuery(query) {
  const { data } = await axios.get(`${PROM_URL}/api/v1/query`, { params: { query }, timeout: 10000 });
  return data.data.result;
}

// Get metrics for a Linux server (node_exporter)
async function getNodeExporterMetrics(ip) {
  const job = `NODE_EXPORTR-${ip}`;
  const [cpu, memTotal, memAvail, diskTotal, diskFree, uptime, loadAvg, netRx, netTx] = await Promise.all([
    promQuery(`100 - (avg by(instance)(rate(node_cpu_seconds_total{job="${job}",mode="idle"}[5m])) * 100)`),
    promQuery(`node_memory_MemTotal_bytes{job="${job}"}`),
    promQuery(`node_memory_MemAvailable_bytes{job="${job}"}`),
    promQuery(`node_filesystem_size_bytes{job="${job}",mountpoint="/",fstype!="tmpfs"}`),
    promQuery(`node_filesystem_avail_bytes{job="${job}",mountpoint="/",fstype!="tmpfs"}`),
    promQuery(`node_time_seconds{job="${job}"} - node_boot_time_seconds{job="${job}"}`),
    promQuery(`node_load1{job="${job}"}`),
    promQuery(`rate(node_network_receive_bytes_total{job="${job}",device!~"lo|veth.*|docker.*|br.*|cni.*|flannel.*"}[5m])`),
    promQuery(`rate(node_network_transmit_bytes_total{job="${job}",device!~"lo|veth.*|docker.*|br.*|cni.*|flannel.*"}[5m])`),
  ]);

  const memTotalVal = parseFloat(memTotal[0]?.value[1] || 0);
  const memAvailVal = parseFloat(memAvail[0]?.value[1] || 0);
  const diskTotalVal = parseFloat(diskTotal[0]?.value[1] || 0);
  const diskFreeVal = parseFloat(diskFree[0]?.value[1] || 0);

  return {
    type: 'linux',
    cpu: { usage: parseFloat(cpu[0]?.value[1] || 0).toFixed(1) },
    memory: {
      total: (memTotalVal / 1073741824).toFixed(1) + ' GB',
      used: ((memTotalVal - memAvailVal) / 1073741824).toFixed(1) + ' GB',
      usage: memTotalVal > 0 ? ((1 - memAvailVal / memTotalVal) * 100).toFixed(1) : '0',
    },
    disk: {
      total: (diskTotalVal / 1073741824).toFixed(1) + ' GB',
      used: ((diskTotalVal - diskFreeVal) / 1073741824).toFixed(1) + ' GB',
      usage: diskTotalVal > 0 ? ((1 - diskFreeVal / diskTotalVal) * 100).toFixed(1) : '0',
    },
    uptime: formatUptime(parseFloat(uptime[0]?.value[1] || 0)),
    load: parseFloat(loadAvg[0]?.value[1] || 0).toFixed(2),
    network: {
      rx: formatBytes(netRx.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0)) + '/s',
      tx: formatBytes(netTx.reduce((sum, r) => sum + parseFloat(r.value[1] || 0), 0)) + '/s',
    },
  };
}

// Get metrics for a Windows server
async function getWindowsExporterMetrics(ip) {
  const job = `WINDOWS_EXPORTR-${ip}`;
  const [cpu, memTotal, memAvail, uptime] = await Promise.all([
    promQuery(`100 - (avg by(instance)(rate(windows_cpu_time_total{job="${job}",mode="idle"}[5m])) * 100)`),
    promQuery(`windows_cs_physical_memory_bytes{job="${job}"}`),
    promQuery(`windows_os_physical_memory_free_bytes{job="${job}"}`),
    promQuery(`windows_system_system_up_time{job="${job}"}`),
  ]);

  const memTotalVal = parseFloat(memTotal[0]?.value[1] || 0);
  const memAvailVal = parseFloat(memAvail[0]?.value[1] || 0);

  return {
    type: 'windows',
    cpu: { usage: parseFloat(cpu[0]?.value[1] || 0).toFixed(1) },
    memory: {
      total: (memTotalVal / 1073741824).toFixed(1) + ' GB',
      used: ((memTotalVal - memAvailVal) / 1073741824).toFixed(1) + ' GB',
      usage: memTotalVal > 0 ? ((1 - memAvailVal / memTotalVal) * 100).toFixed(1) : '0',
    },
    uptime: uptime[0] ? formatUptime(Date.now()/1000 - parseFloat(uptime[0].value[1])) : 'N/A',
  };
}

// Get iDRAC hardware health (Dell servers)
async function getIdracMetrics(ip) {
  const job = `IDRAC-${ip}`;
  const [temps, fans, power, sysStatus, diskStatus, psStatus] = await Promise.all([
    promQuery(`dell_hw_chassis_temps_reading{job="${job}"}`),
    promQuery(`dell_hw_chassis_fan_reading{job="${job}"}`),
    promQuery(`dell_hw_chassis_power_reading{job="${job}"}`),
    promQuery(`dell_hw_system_status{job="${job}"}`),
    promQuery(`dell_hw_storage_pdisk_status{job="${job}"}`),
    promQuery(`dell_hw_ps_status{job="${job}"}`),
  ]);
  return {
    type: 'idrac',
    temperatures: temps.map(t => ({ name: t.metric.name || 'Sensor', value: parseFloat(t.value[1]).toFixed(0) + '\u00b0C' })),
    fans: fans.map(f => ({ name: f.metric.name || 'Fan', rpm: parseFloat(f.value[1]).toFixed(0) })),
    powerWatts: power[0] ? parseFloat(power[0].value[1]).toFixed(0) : 'N/A',
    systemHealth: sysStatus[0] ? (parseFloat(sysStatus[0].value[1]) === 0 ? 'OK' : 'WARNING') : 'UNKNOWN',
    diskCount: diskStatus.length,
    diskHealthy: diskStatus.filter(d => parseFloat(d.value[1]) === 0).length,
    psuCount: psStatus.length,
    psuHealthy: psStatus.filter(p => parseFloat(p.value[1]) === 0).length,
  };
}

// Get iLO hardware health (HPE servers)
async function getIloMetrics(ip) {
  const job = `ILO-${ip}`;
  const [temps, fans, psu, processor, memory, storage] = await Promise.all([
    promQuery(`hpilo_temperature{job="${job}"}`),
    promQuery(`hpilo_fans{job="${job}"}`),
    promQuery(`hpilo_power_supplies{job="${job}"}`),
    promQuery(`hpilo_processor{job="${job}"}`),
    promQuery(`hpilo_memory{job="${job}"}`),
    promQuery(`hpilo_storage{job="${job}"}`),
  ]);
  return {
    type: 'ilo',
    temperatures: temps.map(t => ({ name: t.metric.sensor || 'Sensor', value: parseFloat(t.value[1]).toFixed(0) + '\u00b0C' })),
    fans: fans.map(f => ({ name: f.metric.fan || 'Fan', speed: f.value[1] })),
    psuCount: psu.length,
    psuHealthy: psu.filter(p => parseFloat(p.value[1]) === 0).length,
    processorStatus: processor.length > 0 ? 'OK' : 'UNKNOWN',
    memoryStatus: memory.length > 0 ? 'OK' : 'UNKNOWN',
    storageStatus: storage.length > 0 ? 'OK' : 'UNKNOWN',
  };
}

// Get SNMP metrics (firewall/switch/router)
async function getSnmpMetrics(ip) {
  const job = `SNMP-${ip}`;
  const [up, interfaces] = await Promise.all([
    promQuery(`up{job="${job}"}`),
    promQuery(`ifOperStatus{job="${job}"}`),
  ]);
  return {
    type: 'snmp',
    up: up[0] ? parseFloat(up[0].value[1]) === 1 : false,
    interfaceCount: interfaces.length,
    interfacesUp: interfaces.filter(i => parseFloat(i.value[1]) === 1).length,
  };
}

// Get ping status
async function getPingStatus(ip) {
  const result = await promQuery(`probe_success{instance="${ip}"}`);
  const duration = await promQuery(`probe_duration_seconds{instance="${ip}"}`);
  return {
    reachable: result[0] ? parseFloat(result[0].value[1]) === 1 : false,
    latencyMs: duration[0] ? (parseFloat(duration[0].value[1]) * 1000).toFixed(1) : null,
  };
}

// Get all metrics for an asset based on its type and IP
async function getAssetMetrics(asset) {
  const { ipAddress, prometheusJob, type } = asset;
  if (!ipAddress) return { error: 'No IP address' };

  const result = { ip: ipAddress, timestamp: new Date().toISOString() };

  try {
    // Always get ping status
    result.ping = await getPingStatus(ipAddress);

    // Get OS-level metrics based on job type
    if (prometheusJob?.startsWith('NODE_EXPORTR')) {
      result.os = await getNodeExporterMetrics(ipAddress);
    } else if (prometheusJob?.startsWith('WINDOWS_EXPORTR')) {
      result.os = await getWindowsExporterMetrics(ipAddress);
    }

    // Get hardware health based on available exporters
    // Check iDRAC
    const idracUp = await promQuery(`up{job="IDRAC-${ipAddress}"}`);
    if (idracUp.length > 0 && parseFloat(idracUp[0].value[1]) === 1) {
      result.hardware = await getIdracMetrics(ipAddress);
    }
    // Check iLO
    const iloUp = await promQuery(`up{job="ILO-${ipAddress}"}`);
    if (iloUp.length > 0 && parseFloat(iloUp[0].value[1]) === 1) {
      result.hardware = await getIloMetrics(ipAddress);
    }

    // SNMP for network devices
    if (prometheusJob?.startsWith('SNMP')) {
      result.snmp = await getSnmpMetrics(ipAddress);
    }

  } catch (err) {
    result.error = err.message;
  }

  return result;
}

// Helper: format bytes
function formatBytes(bytes) {
  if (bytes < 1024) return bytes.toFixed(0) + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

// Helper: format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return days + 'd ' + hours + 'h';
  const mins = Math.floor((seconds % 3600) / 60);
  return hours + 'h ' + mins + 'm';
}

module.exports = { getAssetMetrics, getNodeExporterMetrics, getWindowsExporterMetrics, getIdracMetrics, getIloMetrics, getSnmpMetrics, getPingStatus };
