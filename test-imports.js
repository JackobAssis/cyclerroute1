/**
 * Test file para verificar imports
 */

console.log('🧪 Testando imports do map-init.js...');

try {
  import('./src/map/map-init.js').then(module => {
    console.log('✅ map-init.js carregado com sucesso');
    console.log('📦 Exports disponíveis:', Object.keys(module));
    
    if (module.createDefaultIcon) {
      console.log('✅ createDefaultIcon encontrado');
      const icon = module.createDefaultIcon();
      console.log('✅ createDefaultIcon executado:', icon);
    } else {
      console.error('❌ createDefaultIcon não encontrado');
    }
  }).catch(error => {
    console.error('❌ Erro ao carregar map-init.js:', error);
  });
} catch (error) {
  console.error('❌ Erro crítico:', error);
}