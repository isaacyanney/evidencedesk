import { defineSandbox } from 'eve/sandbox';
import { JustBashSandbox } from 'eve/sandbox/just-bash';
// No shell or file tools are exposed. This satisfies eve's sandbox runtime without Docker.
export const environment=JustBashSandbox.environment({autoInstall:false});
export default defineSandbox(()=>environment.open());
