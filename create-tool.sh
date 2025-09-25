#!/bin/bash

# 工具管理脚本
# 用法: ./create-tool.sh [create|remove]

# 显示帮助信息
show_help() {
    echo "🛠️  工具管理脚本"
    echo "=================="
    echo ""
    echo "用法:"
    echo "  ./create-tool.sh create   - 创建新工具"
    echo "  ./create-tool.sh remove   - 删除现有工具"
    echo "  ./create-tool.sh          - 交互式选择操作"
    echo ""
}

# 创建工具函数
create_tool() {
    echo "🛠️  工具创建向导"
    echo "=================="

    # 获取中文名
    read -p "请输入工具的中文名称（如：开发工具）: " chinese_name
    if [ -z "$chinese_name" ]; then
        echo "❌ 中文名称不能为空"
        return 1
    fi

    # 获取英文名
    read -p "请输入工具的英文名称（如：devtools）: " english_name
    if [ -z "$english_name" ]; then
        echo "❌ 英文名称不能为空"
        return 1
    fi

    # 验证英文名格式
    if [[ ! $english_name =~ ^[a-z][a-z0-9]*$ ]]; then
        echo "❌ 英文名只能包含小写字母和数字，且必须以字母开头"
        return 1
    fi

    # 获取图标（可选）
    echo ""
    echo "常用图标选择："
    echo "1. bi-tools (工具)"
    echo "2. bi-code-slash (代码)"
    echo "3. bi-file-text (文本)"
    echo "4. bi-calculator (计算器)"
    echo "5. bi-gear (设置)"
    echo "6. bi-palette (设计)"
    echo "7. bi-database (数据库)"
    echo "8. bi-cloud (云服务)"
    echo "9. 自定义图标"
    echo ""

    read -p "请选择图标 (1-9，默认为1): " icon_choice

    case $icon_choice in
        1|"") icon="bi-tools" ;;
        2) icon="bi-code-slash" ;;
        3) icon="bi-file-text" ;;
        4) icon="bi-calculator" ;;
        5) icon="bi-gear" ;;
        6) icon="bi-palette" ;;
        7) icon="bi-database" ;;
        8) icon="bi-cloud" ;;
        9)
            read -p "请输入自定义图标类名（如：bi-star）: " icon
            if [ -z "$icon" ]; then
                icon="bi-tools"
            fi
            ;;
        *) icon="bi-tools" ;;
    esac

    # 选择页面模板类型
    echo ""
    echo "📄 页面模板选择："
    echo "1. 通用模板 - 简洁的基础模板，适合快速开发"
    echo "2. 增强版模板 - 包含完整文件处理功能的模板"
    echo ""
    echo "模板对比："
    echo "┌─────────────────┬──────────────────┬────────────────────┐"
    echo "│ 特性            │ 通用模板         │ 增强版模板         │"
    echo "├─────────────────┼──────────────────┼────────────────────┤"
    echo "│ 页面复杂度      │ 中等 (~182行)    │ 功能完整 (~226行)  │"
    echo "│ 布局设计        │ 左右分栏布局     │ 左右分栏布局       │"
    echo "│ 输入方式        │ 文本+配置选项    │ 文件/文件夹选择器  │"
    echo "│ 拖拽上传        │ 无               │ 支持拖拽           │"
    echo "│ 进度显示        │ 处理状态指示器   │ 实时进度条         │"
    echo "│ 消息提示        │ 双重提示系统     │ 完整提示系统       │"
    echo "│ Electron集成    │ 基础检测         │ 完整IPC支持        │"
    echo "│ 开发难度        │ 5-10分钟定制     │ 开箱即用           │"
    echo "└─────────────────┴──────────────────┴────────────────────┘"
    echo ""

    read -p "请选择模板类型 (1-2，默认为2): " template_choice

    case $template_choice in
        1)
            template_type="basic"
            template_name="通用模板"
            ;;
        2|"")
            template_type="enhanced"
            template_name="增强版模板"
            ;;
        *)
            template_type="enhanced"
            template_name="增强版模板"
            ;;
    esac

    echo ""
    echo "📋 创建信息确认："
    echo "中文名称: $chinese_name"
    echo "英文名称: $english_name"
    echo "图标: $icon"
    echo "模板类型: $template_name"
    echo ""

    # 检查文件是否已存在
    files_exist=false
    if [ -f "routes/$english_name.js" ] || [ -f "services/${english_name}Service.js" ] || [ -f "views/$english_name.ejs" ] || [ -f "public/js/$english_name.js" ]; then
        files_exist=true
        echo "⚠️  检测到以下文件已存在："
        [ -f "routes/$english_name.js" ] && echo "   - routes/$english_name.js"
        [ -f "services/${english_name}Service.js" ] && echo "   - services/${english_name}Service.js"
        [ -f "views/$english_name.ejs" ] && echo "   - views/$english_name.ejs"
        [ -f "public/js/$english_name.js" ] && echo "   - public/js/$english_name.js"
        echo ""
    fi

    if [ "$files_exist" = true ]; then
        read -p "是否覆盖现有文件？(y/N): " overwrite_confirm
        if [[ $overwrite_confirm =~ ^[Yy]$ ]]; then
            overwrite_flag="--overwrite"
        else
            echo "❌ 已取消创建"
            return 0
        fi
    else
        read -p "确认创建？(y/N): " confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo "❌ 已取消创建"
            return 0
        fi
        overwrite_flag=""
    fi

    echo ""
    echo "🚀 开始创建工具..."

    # 执行创建脚本
    node scripts/create-tool.js "$chinese_name" "$english_name" "$icon" --template="$template_type" $overwrite_flag

    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 工具创建成功！"
        echo ""

        # 询问是否自动重启应用
        read -p "🔄 是否自动重启桌面应用以加载新工具？(Y/n): " restart_confirm
        if [[ ! $restart_confirm =~ ^[Nn]$ ]]; then
            echo ""
            echo "🔄 正在重启桌面应用..."

            # 检查是否有正在运行的 Electron 进程
            electron_pids=$(pgrep -f "electron.*Myapp" 2>/dev/null)
            if [ ! -z "$electron_pids" ]; then
                echo "🛑 关闭现有的桌面应用进程..."
                echo "$electron_pids" | xargs kill -TERM 2>/dev/null
                sleep 2

                # 如果进程仍然存在，强制关闭
                electron_pids=$(pgrep -f "electron.*Myapp" 2>/dev/null)
                if [ ! -z "$electron_pids" ]; then
                    echo "🔨 强制关闭应用进程..."
                    echo "$electron_pids" | xargs kill -KILL 2>/dev/null
                    sleep 1
                fi
            fi

            # 启动新的应用实例
            echo "🚀 启动桌面应用..."
            if command -v npm >/dev/null 2>&1; then
                nohup npm run electron > /dev/null 2>&1 &
                echo "✅ 桌面应用已启动 (使用 npm run electron)"
            elif command -v yarn >/dev/null 2>&1; then
                nohup yarn electron > /dev/null 2>&1 &
                echo "✅ 桌面应用已启动 (使用 yarn electron)"
            else
                echo "⚠️  未找到 npm 或 yarn，请手动启动应用"
            fi

            sleep 3
            echo ""
            echo "🎯 新工具已可用！"
            echo "📍 访问地址: http://localhost:3000/$english_name"
        else
            echo ""
            echo "📝 手动重启说明："
            echo "1. 重启应用: npm run electron 或 yarn electron"
            echo "2. 访问新工具: http://localhost:3000/$english_name"
        fi

        echo ""
        echo "📚 开发指南："
        echo "   - 服务逻辑: services/${english_name}Service.js"
        echo "   - 页面样式: views/${english_name}.ejs"
        echo "   - 前端交互: public/js/${english_name}.js"
        echo ""
        echo "💡 提示: 所有文件都包含了基础模板和TODO注释，您只需要填充具体的业务逻辑即可！"
    else
        echo "❌ 工具创建失败，请检查错误信息"
        return 1
    fi
}

# 删除工具函数
remove_tool() {
    echo "🗑️  工具删除向导"
    echo "=================="
    echo ""

    # 获取要删除的工具名
    read -p "请输入要删除的工具英文名称（如：devtools）: " english_name
    if [ -z "$english_name" ]; then
        echo "❌ 英文名称不能为空"
        return 1
    fi

    # 验证英文名格式
    if [[ ! $english_name =~ ^[a-z][a-z0-9]*$ ]]; then
        echo "❌ 英文名只能包含小写字母和数字，且必须以字母开头"
        return 1
    fi

    echo ""
    echo "🔍 检查工具文件..."

    # 检查文件是否存在
    files_to_remove=()
    [ -f "routes/$english_name.js" ] && files_to_remove+=("routes/$english_name.js")
    [ -f "services/${english_name}Service.js" ] && files_to_remove+=("services/${english_name}Service.js")
    [ -f "views/$english_name.ejs" ] && files_to_remove+=("views/$english_name.ejs")
    [ -f "public/js/$english_name.js" ] && files_to_remove+=("public/js/$english_name.js")

    if [ ${#files_to_remove[@]} -eq 0 ]; then
        echo "❌ 未找到工具 '$english_name' 的相关文件"
        return 1
    fi

    echo "📋 将要删除的文件："
    for file in "${files_to_remove[@]}"; do
        echo "   - $file"
    done
    echo ""
    echo "⚠️  同时会从以下文件中移除相关配置："
    echo "   - app.js (路由注册)"
    echo "   - views/partials/sidebar.ejs (导航项)"
    echo ""

    read -p "确认删除工具 '$english_name'？(y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "❌ 已取消删除"
        return 0
    fi

    echo ""
    echo "🗑️  开始删除工具..."

    # 删除文件
    for file in "${files_to_remove[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "✅ 删除文件: $file"
        fi
    done

    # 从 app.js 中移除路由
    if [ -f "app.js" ]; then
        # 移除 require 语句
        sed -i '' "/const ${english_name}Router = require('\.\/routes\/${english_name}');/d" app.js
        # 移除 app.use 语句
        sed -i '' "/app\.use('\/${english_name}', ${english_name}Router);/d" app.js
        echo "✅ 从 app.js 移除路由配置"
    fi

    # 从 sidebar.ejs 中移除导航项
    if [ -f "views/partials/sidebar.ejs" ]; then
        # 使用改进的删除逻辑
        # 首先找到包含目标工具链接的行号
        target_line=$(grep -n "href=\"/${english_name}\"" views/partials/sidebar.ejs | cut -d: -f1)

        if [ ! -z "$target_line" ]; then
            # 向前查找最近的 <li class="nav-item"> 的行号
            li_start=$(awk -v target="$target_line" '
                NR <= target && /<li class="nav-item">/ { start = NR }
                END { print start }
            ' views/partials/sidebar.ejs)

            # 从目标行向后查找最近的 </li> 的行号
            li_end=$(awk -v target="$target_line" '
                NR >= target && /<\/li>/ { print NR; exit }
            ' views/partials/sidebar.ejs)

            if [ ! -z "$li_start" ] && [ ! -z "$li_end" ]; then
                # 删除从 li_start 到 li_end 的所有行
                sed -i '' "${li_start},${li_end}d" views/partials/sidebar.ejs
                echo "✅ 删除导航项：第 ${li_start} 到 ${li_end} 行"

                # 检查并修复可能的格式问题
                # 如果删除后出现连续的 </li> 和 <li>，进行格式化
                sed -i '' 's|</li>[ ]*<li class="nav-item">|</li>\
        <li class="nav-item">|g' views/partials/sidebar.ejs

                # 清理多余的空行
                sed -i '' '/^[[:space:]]*$/N;/^\n$/d' views/partials/sidebar.ejs
            else
                echo "⚠️  无法确定导航项的完整范围，使用备用方法"
                # 备用方法：删除包含目标链接的行及其前后相关行
                sed -i '' "/${english_name}/,+3d" views/partials/sidebar.ejs
                sed -i '' "/href=\"\/${english_name}\"/,+3d" views/partials/sidebar.ejs
            fi
        else
            echo "ℹ️  未找到目标工具的导航项"
        fi

        # 移除导航高亮脚本中的条件
        sed -i '' "/currentPath\.startsWith('\/${english_name}')/d" views/partials/sidebar.ejs

        echo "✅ 从侧边栏移除导航项"
    fi

    echo ""
    echo "🎉 工具删除完成！"
    echo ""

    # 询问是否自动重启应用
    read -p "🔄 是否自动重启桌面应用以应用更改？(Y/n): " restart_confirm
    if [[ ! $restart_confirm =~ ^[Nn]$ ]]; then
        echo ""
        echo "🔄 正在重启桌面应用..."

        # 检查是否有正在运行的 Electron 进程
        electron_pids=$(pgrep -f "electron.*Myapp" 2>/dev/null)
        if [ ! -z "$electron_pids" ]; then
            echo "🛑 关闭现有的桌面应用进程..."
            echo "$electron_pids" | xargs kill -TERM 2>/dev/null
            sleep 2

            # 如果进程仍然存在，强制关闭
            electron_pids=$(pgrep -f "electron.*Myapp" 2>/dev/null)
            if [ ! -z "$electron_pids" ]; then
                echo "🔨 强制关闭应用进程..."
                echo "$electron_pids" | xargs kill -KILL 2>/dev/null
                sleep 1
            fi
        fi

        # 启动新的应用实例
        echo "🚀 启动桌面应用..."
        if command -v npm >/dev/null 2>&1; then
            nohup npm run electron > /dev/null 2>&1 &
            echo "✅ 桌面应用已启动 (使用 npm run electron)"
        elif command -v yarn >/dev/null 2>&1; then
            nohup yarn electron > /dev/null 2>&1 &
            echo "✅ 桌面应用已启动 (使用 yarn electron)"
        else
            echo "⚠️  未找到 npm 或 yarn，请手动启动应用"
        fi

        sleep 3
        echo ""
        echo "✅ 工具 '$english_name' 已完全移除并应用更改！"
    else
        echo ""
        echo "📝 手动重启说明："
        echo "1. 重启应用: npm run electron 或 yarn electron"
        echo "2. 工具 '$english_name' 已完全移除"
    fi
    echo ""
}

# 主逻辑
main() {
    # 检查命令行参数
    case "${1:-}" in
        "create")
            create_tool
            ;;
        "remove")
            remove_tool
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            # 交互式选择
            echo "🛠️  工具管理脚本"
            echo "=================="
            echo ""
            echo "请选择操作："
            echo "1. 创建新工具"
            echo "2. 删除现有工具"
            echo "3. 显示帮助"
            echo ""

            read -p "请选择 (1-3): " choice
            case $choice in
                1)
                    echo ""
                    create_tool
                    ;;
                2)
                    echo ""
                    remove_tool
                    ;;
                3)
                    echo ""
                    show_help
                    ;;
                *)
                    echo "❌ 无效选择"
                    exit 1
                    ;;
            esac
            ;;
        *)
            echo "❌ 未知参数: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 执行主逻辑
main "$@"
