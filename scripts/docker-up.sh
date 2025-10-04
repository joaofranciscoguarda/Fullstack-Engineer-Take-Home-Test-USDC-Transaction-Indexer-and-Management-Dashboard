# relative to the script's directory
cd "$(dirname "$0")"

# move the last hash if it exists
if [ -f package.json.md5 ]; then
    mv package.json.md5 package.json.md5.last
fi

# save a hash of package.json
md5sum ../package.json >package.json.md5

# check if the hashes are different
if ! cmp -s package.json.md5 package.json.md5.last; then
    echo "package.json changed, rebuilding image"
    docker image prune --force
    docker volume prune --force
    docker compose up --remove-orphans -V --build app
else
    echo "package.json didn't change, starting containers"
    docker compose up --remove-orphans
fi
