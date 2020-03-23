## Install Utilities in Kubernetes Using Helm

This guide explains how to use `Helm 3` to install the following utilities:

- Prometheus
- Grafana

The intent of the fabric-test helm package is to create a standardized methodology
for deploying common tools into fabric-test's Kuberenetes clusters.

**Note**: This guide assumes you have configured your local `kubectl` to communicate with
your Kubernetes cluster, and you've installed `Helm 3`.

### Prometheus

To install Prometheus simply run the `./scripts/helm/prometheus/deploy.sh` script

### Grafana

To install Grafana navigate to `./scripts/helm/grafana` and edit the `values.yaml`
file. You will need to edit any field which contains angle brackets `<>`.

Once you have filled in your `values.yaml` you can simply run the 
`./scripts/helm/grafana/deploy.sh`
