const fs = require('fs');
const path = require('path');

exports.default = async function(context) {
  console.log('🔧 执行afterPack脚本...');
  
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'darwin') {
    const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.app`);
    const resourcesPath = path.join(appPath, 'Contents', 'Resources');
    const sharpPath = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'sharp');
    
    console.log('📍 Sharp路径:', sharpPath);
    
    if (fs.existsSync(sharpPath)) {
      console.log('✅ Sharp模块已正确解包');
      
      // 检查vendor目录
      const vendorPath = path.join(sharpPath, 'vendor');
      if (fs.existsSync(vendorPath)) {
        console.log('✅ Sharp vendor目录存在');
      } else {
        console.log('⚠️ Sharp vendor目录不存在');
      }
    } else {
      console.log('❌ Sharp模块未找到');
    }
  }
  
  console.log('✅ afterPack脚本执行完成');
};
