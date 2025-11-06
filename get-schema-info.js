const { getWasmModule } = require('@prisma/engines');
(async () => {
  try {
    const { schemaEngine } = await getWasmModule();
    const info = schemaEngine.version();
    console.log(info);
  } catch (err) {
    console.error('failed', err);
    process.exit(1);
  }
})();
