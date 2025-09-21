#!/bin/bash

# 工具交互式启动脚本
# 支持: Web开发模式、Electron桌面应用、应用打包

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="桌面工具集"
PROJECT_VERSION="1.0.0"
DEFAULT_PORT=3000

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 打印标题
print_title() {
    echo ""
    print_message $CYAN "════════════════════════════════════════"
    print_message $WHITE "    🧰  $PROJECT_NAME v$PROJECT_VERSION"
    print_message $CYAN "════════════════════════════════════════"
    echo ""
}

# 检查系统环境
check_environment() {
    print_message $BLUE "🔍 检查系统环境..."
    echo ""
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_message $RED "❌ 错误: 未找到 Node.js"
        print_message $YELLOW "   请安装 Node.js >= 16.0.0"
        print_message $YELLOW "   下载地址: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v)
    print_message $GREEN "✅ Node.js: $NODE_VERSION"
    
    # 检查 npm/yarn
    if command -v yarn &> /dev/null; then
        YARN_VERSION=$(yarn -v)
        print_message $GREEN "✅ Yarn: v$YARN_VERSION"
        PACKAGE_MANAGER="yarn"
    elif command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        print_message $GREEN "✅ npm: v$NPM_VERSION"
        PACKAGE_MANAGER="npm"
    else
        print_message $RED "❌ 错误: 未找到 npm 或 yarn"
        exit 1
    fi
    
    # 检查项目依赖
    if [ ! -d "node_modules" ]; then
        print_message $YELLOW "⚠️  未找到 node_modules，需要安装依赖"
        install_dependencies
    else
        print_message $GREEN "✅ 项目依赖已安装"
    fi
    
    echo ""
}

# 安装依赖
install_dependencies() {
    print_message $BLUE "📦 安装项目依赖..."
    
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn install
    else
        npm install
    fi
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ 依赖安装完成"
    else
        print_message $RED "❌ 依赖安装失败"
        exit 1
    fi
    echo ""
}

# 检查端口占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    else
        return 1  # 端口空闲
    fi
}

# 杀死占用端口的进程
kill_port_process() {
    local port=$1
    print_message $YELLOW "🔄 检测到端口 $port 被占用，正在关闭相关进程..."
    
    # 查找并杀死占用端口的进程
    local pids=$(lsof -ti:$port)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9
        sleep 2
        print_message $GREEN "✅ 已关闭端口 $port 上的进程"
    fi
}

# Web开发模式
start_dev_mode() {
    print_message $BLUE "🌐 启动Web开发模式..."
    echo ""
    
    # 检查并处理端口占用
    if check_port $DEFAULT_PORT; then
        print_message $YELLOW "⚠️  端口 $DEFAULT_PORT 已被占用"
        echo ""
        echo "请选择操作:"
        echo "1) 关闭占用进程并重启"
        echo "2) 使用其他端口"
        echo "3) 取消操作"
        echo ""
        read -p "请输入选择 (1-3): " port_choice
        
        case $port_choice in
            1)
                kill_port_process $DEFAULT_PORT
                ;;
            2)
                read -p "请输入新端口号: " new_port
                if [[ "$new_port" =~ ^[0-9]+$ ]] && [ "$new_port" -ge 1024 ] && [ "$new_port" -le 65535 ]; then
                    DEFAULT_PORT=$new_port
                    export PORT=$DEFAULT_PORT
                else
                    print_message $RED "❌ 无效的端口号"
                    return 1
                fi
                ;;
            3)
                print_message $YELLOW "🚫 操作已取消"
                return 1
                ;;
            *)
                print_message $RED "❌ 无效选择"
                return 1
                ;;
        esac
    fi
    
    print_message $GREEN "🚀 启动开发服务器 (端口: $DEFAULT_PORT)..."
    print_message $CYAN "📍 访问地址: http://localhost:$DEFAULT_PORT"
    print_message $YELLOW "💡 按 Ctrl+C 停止服务器"
    echo ""
    
    # 启动开发服务器
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn dev
    else
        npm run dev
    fi
}

# Electron桌面应用
start_electron_app() {
    print_message $BLUE "🖥️  启动Electron桌面应用..."
    echo ""
    
    # 检查Electron是否安装
    if [ ! -d "node_modules/electron" ]; then
        print_message $YELLOW "⚠️  未找到Electron，正在安装..."
        if [ "$PACKAGE_MANAGER" = "yarn" ]; then
            yarn add --dev electron
        else
            npm install --save-dev electron
        fi
    fi
    
    # 检查并处理端口占用
    if check_port $DEFAULT_PORT; then
        print_message $YELLOW "⚠️  检测到端口 $DEFAULT_PORT 被占用，正在处理..."
        kill_port_process $DEFAULT_PORT
    fi
    
    print_message $GREEN "🚀 启动桌面应用..."
    print_message $YELLOW "💡 桌面应用将自动启动Express服务器"
    echo ""
    
    # 启动Electron应用
    if [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn electron
    else
        npm run electron
    fi
}

# 打包桌面应用
build_electron_app() {
    print_message $BLUE "📦 打包Electron桌面应用..."
    echo ""
    
    # 检查electron-builder是否安装
    if [ ! -d "node_modules/electron-builder" ]; then
        print_message $YELLOW "⚠️  未找到electron-builder，正在安装..."
        if [ "$PACKAGE_MANAGER" = "yarn" ]; then
            yarn add --dev electron-builder
        else
            npm install --save-dev electron-builder
        fi
    fi
    
    echo "请选择打包平台:"
    echo "1) macOS (DMG + ZIP)"
    echo "2) Windows (NSIS)"
    echo "3) Linux (AppImage)"
    echo "4) 所有平台"
    echo "5) 仅打包不分发 (测试用)"
    echo ""
    read -p "请输入选择 (1-5): " build_choice
    
    case $build_choice in
        1)
            print_message $GREEN "🍎 打包macOS应用..."
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                yarn build-mac
            else
                npm run build-mac
            fi
            ;;
        2)
            print_message $GREEN "🪟 打包Windows应用..."
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                yarn build-win
            else
                npm run build-win
            fi
            ;;
        3)
            print_message $GREEN "🐧 打包Linux应用..."
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                yarn build-linux
            else
                npm run build-linux
            fi
            ;;
        4)
            print_message $GREEN "🌍 打包所有平台..."
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                yarn build
            else
                npm run build
            fi
            ;;
        5)
            print_message $GREEN "🧪 测试打包..."
            if [ "$PACKAGE_MANAGER" = "yarn" ]; then
                yarn pack
            else
                npm run pack
            fi
            ;;
        *)
            print_message $RED "❌ 无效选择"
            return 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        print_message $GREEN "✅ 打包完成！"
        print_message $CYAN "📁 输出目录: ./dist/"
        
        # 显示生成的文件
        if [ -d "dist" ]; then
            echo ""
            print_message $BLUE "📋 生成的文件:"
            ls -la dist/ | grep -v "^d" | awk '{print "   " $9 " (" $5 " bytes)"}'
        fi
    else
        print_message $RED "❌ 打包失败"
    fi
}

# 显示主菜单
show_main_menu() {
    print_title
    
    print_message $WHITE "请选择启动模式:"
    echo ""
    echo "  1) 🌐 Web开发模式 (浏览器访问)"
    echo "  2) 🖥️  Electron桌面应用"
    echo "  3) 📦 打包桌面应用"
    echo "  4) 🔧 安装/更新依赖"
    echo "  5) 📊 查看项目信息"
    echo "  6) 🚪 退出"
    echo ""
}

# 查看项目信息
show_project_info() {
    print_message $BLUE "📊 项目信息"
    echo ""
    print_message $WHITE "项目名称: $PROJECT_NAME"
    print_message $WHITE "项目版本: $PROJECT_VERSION"
    print_message $WHITE "项目目录: $(pwd)"
    print_message $WHITE "包管理器: $PACKAGE_MANAGER"
    
    if [ -f "package.json" ]; then
        echo ""
        print_message $BLUE "📋 可用脚本:"
        if command -v jq &> /dev/null; then
            jq -r '.scripts | to_entries[] | "   \(.key): \(.value)"' package.json
        else
            grep -A 20 '"scripts"' package.json | grep -E '^\s*"[^"]+":' | sed 's/^/   /'
        fi
    fi
    
    echo ""
    print_message $BLUE "🌐 服务信息:"
    print_message $WHITE "   默认端口: $DEFAULT_PORT"
    print_message $WHITE "   访问地址: http://localhost:$DEFAULT_PORT"
    
    if check_port $DEFAULT_PORT; then
        print_message $YELLOW "   状态: 端口被占用"
    else
        print_message $GREEN "   状态: 端口空闲"
    fi
    
    echo ""
}

# 主程序
main() {
    # 检查是否在正确的目录
    if [ ! -f "package.json" ]; then
        print_message $RED "❌ 错误: 未找到 package.json"
        print_message $YELLOW "   请确保在项目根目录下运行此脚本"
        exit 1
    fi
    
    # 检查环境
    check_environment
    
    # 主循环
    while true; do
        show_main_menu
        read -p "请输入选择 (1-6): " choice
        echo ""
        
        case $choice in
            1)
                start_dev_mode
                ;;
            2)
                start_electron_app
                ;;
            3)
                build_electron_app
                ;;
            4)
                install_dependencies
                ;;
            5)
                show_project_info
                ;;
            6)
                print_message $GREEN "👋 感谢使用 $PROJECT_NAME！"
                exit 0
                ;;
            *)
                print_message $RED "❌ 无效选择，请输入 1-6"
                ;;
        esac
        
        echo ""
        read -p "按回车键继续..." -r
        clear
    done
}

# 捕获 Ctrl+C 信号
trap 'echo ""; print_message $YELLOW "🚫 操作已取消"; exit 0' INT

# 清屏并启动
clear
main
