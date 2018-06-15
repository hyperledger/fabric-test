import { environment } from '../environments/environment';

const prod = environment.production;
const port = '3000';
const serverurl = prod ? '' : `http://${window.location.host.split(":")[0]}:${port}`;

export { serverurl }