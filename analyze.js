const fs = require('fs');
const path = require('path');

const srcPath = path.join('C:', 'Users', 'HP', 'certi2', 'BackendProyecto1', 'src');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const allFiles = walk(srcPath);

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, i) => {
    // 1. SECURITY & AUTH
    if (file.includes('.controller.ts') && line.includes('@Controller')) {
      if (!content.includes('JwtAuthGuard') && !content.includes('AuthGuard') && !content.includes('@Public()') && !content.includes('@Roles')) {
        console.log(`[SEGURIDAD] Missing Guards at Controller: ${file}`);
      }
    }
    if (file.includes('.controller.ts') && (line.includes('@Get') || line.includes('@Post') || line.includes('@Patch') || line.includes('@Delete'))) {
       // Check if method is missing Roles but not Public
       // This is a bit complex, let's just grep manually for some.
    }
    if (line.includes('select(') && line.includes('password') && !line.includes('-password')) {
       console.log(`[SEGURIDAD] Password exposed?: ${file}:${i+1}`);
    }

    // 2. DB LOGIC (Schemas missing unique: true)
    if (file.includes('.schema.ts') && (line.includes('email:') || line.includes('carnet:') || line.includes('matricula:'))) {
        if (!content.includes('unique: true') && !line.includes('unique: true')) {
             console.log(`[BASE DE DATOS] Missing unique constraint on email/carnet: ${file}:${i+1}`);
        }
    }
    // Delete cascade (orphan docs) - look for .deleteOne() or .findByIdAndDelete()
    if (line.includes('.deleteOne(') || line.includes('.findByIdAndDelete(') || line.includes('.remove(')) {
        console.log(`[BASE DE DATOS] Deletion found, check cascade: ${file}:${i+1}`);
    }
    // ObjectId injection - Controllers missing ParseObjectIdPipe
    if (file.includes('.controller.ts') && line.includes('@Param(\'id\')') && !line.includes('ParseObjectIdPipe')) {
        console.log(`[BASE DE DATOS] Missing ParseObjectIdPipe: ${file}:${i+1}`);
    }

    // 3. DATA VALIDATION (DTOs missing class-validator)
    if (file.includes('.dto.ts') && line.includes('@ApiProperty') && !line.includes('@Is')) {
        // console.log(`[VALIDACION] Missing class-validator decorator near ApiProperty: ${file}:${i+1}`);
    }
    if (file.includes('.dto.ts') && line.includes('role:')) {
        console.log(`[VALIDACION] Possible mass assignment of role: ${file}:${i+1}`);
    }

    // 4. ERROR HANDLING
    if (line.includes('.save()') && !line.includes('await') && !line.includes('return') && !content.includes('Promise.all')) {
        console.log(`[ERRORES] Missing await on save: ${file}:${i+1}`);
    }
    if (line.includes('InternalServerErrorException') || line.includes('Error(')) {
        console.log(`[ERRORES] Generic/Internal error thrown instead of 404/400: ${file}:${i+1}`);
    }

    // 5. SWAGGER
    if (file.includes('.controller.ts') && line.includes('@ApiResponse')) {
        console.log(`[SWAGGER] Check ApiResponse: ${file}:${i+1}`);
    }
  });
}
