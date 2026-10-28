#!/bin/bash
# 로컬 서버 한 번에 켜기 — PHP API + React 앱 + phpMyAdmin
# 실행: ./start.sh   (php_test 폴더에서)   /   끄기: Ctrl + C (이 스크립트가 켠 서버는 같이 꺼짐)

cd "$(dirname "$0")"

# Ctrl + C 를 누르면 이 스크립트가 띄운 서버를 모두 끈다
trap 'echo; echo "서버를 끕니다."; kill 0' INT TERM EXIT

# 포트가 비어 있을 때만 켠다 (이미 다른 터미널에서 켜져 있으면 그대로 쓴다)
start() {   # start 이름 포트 명령...
    local name=$1 port=$2; shift 2
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "  [$name] $port 포트는 이미 켜져 있어서 그대로 씁니다."
    else
        "$@" 2>&1 | sed "s/^/[$name] /" &
    fi
}

start API        8150 php -S localhost:8150 -t server server/router.php
start phpMyAdmin 8090 php -S localhost:8090 -t /opt/homebrew/share/phpmyadmin

# React 앱 (web/) — 처음 한 번은 web 폴더에서 npm install 이 필요하다
if [ -d web/node_modules ]; then
    start React      5173 npm --prefix web run dev
else
    echo "  [React] web/node_modules 가 없어서 건너뜁니다. 처음 한 번: cd web && npm install"
fi

sleep 1
echo ""
echo "  홈페이지     http://localhost:5173/"
echo "  관리자       http://localhost:5173/admin     (admin / admin1234)"
echo "  PHP API      http://localhost:8150/api/home   (React 가 부르는 데이터)"
echo "  phpMyAdmin   http://localhost:8090/            (root / 비밀번호 없음)"
echo ""
echo "  끄려면 Ctrl + C"
echo ""

wait
