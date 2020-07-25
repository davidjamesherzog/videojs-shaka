set -o errexit
set -o pipefail
set -o nounset
shopt -s failglob
set -o xtrace

export DEBIAN_FRONTEND=noninteractive

curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install -y build-essential nodejs
