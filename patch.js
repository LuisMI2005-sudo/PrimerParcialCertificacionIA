const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src');

const patches = {
    'main.ts': [
        {
            search: "app.useGlobalFilters(new AllExceptionsFilter());",
            replace: "app.enableCors();\n  const reflector = app.get(Reflector);\n  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));\n  app.useGlobalFilters(new AllExceptionsFilter());"
        },
        {
            search: "import { ValidationPipe } from '@nestjs/common';",
            replace: "import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';\nimport { Reflector } from '@nestjs/core';"
        },
        {
            search: "const port = Number(process.env.APP_PORT ?? 3001);",
            replace: "const configService = app.get(ConfigService);\n  const port = configService.get('PORT') || Number(process.env.APP_PORT ?? 3001);"
        }
    ],
    'auth/auth.module.ts': [
        {
            search: "{ provide: APP_GUARD, useClass: JwtAuthGuard },",
            replace: "{ provide: APP_GUARD, useClass: JwtAuthGuard },\n    { provide: APP_GUARD, useClass: RolesGuard },"
        },
        {
            search: "import { JwtAuthGuard } from './guards/jwt-auth.guard';",
            replace: "import { JwtAuthGuard } from './guards/jwt-auth.guard';\nimport { RolesGuard } from './guards/roles.guard';"
        },
        {
            search: "expiresIn: String(config.getOrThrow<number>('JWT_EXPIRES_IN_SECONDS')) as StringValue",
            replace: "expiresIn: config.getOrThrow<number>('JWT_EXPIRES_IN_SECONDS')"
        }
    ],
    'auth/auth.service.ts': [
        {
            search: "setTimeout(resolve, 5000)",
            replace: "setTimeout(resolve, 0)"
        }
    ],
    'auth/strategies/jwt.strategy.ts': [
        {
            search: "user.passwordChangedAt.getTime()",
            replace: "Math.floor(user.passwordChangedAt.getTime() / 1000) * 1000"
        }
    ],
    'users/users.controller.ts': [
        {
            search: "@HttpCode(400)",
            replace: "@HttpCode(201)"
        },
        // We will move @Get('me') using a specific regex
        {
            search: new RegExp("(@ApiOperation\\(\\{\\s*summary: 'Ver un usuario por ID'\\s*\\}\\)\\s*@Get\\(':id'\\)[\\s\\S]*?)(@ApiOperation\\(\\{\\s*summary: 'Mi perfil de usuario'\\s*\\}\\)[\\s\\S]*?\\}[\\r\\n]+)", "g"),
            replace: "$2$1"
        }
    ],
    'groups/groups.controller.ts': [
        {
            search: new RegExp("(@ApiOperation\\(\\{\\s*summary: 'Ver un grupo por ID'\\s*\\}\\)\\s*@Get\\(':id'\\)[\\s\\S]*?)(@ApiOperation\\(\\{\\s*summary: 'Mis grupos \\(docente\\)'\\s*\\}\\)[\\s\\S]*?\\}[\\r\\n]+)", "g"),
            replace: "$2$1"
        }
    ],
    'users/dto/create-user.dto.ts': [
        {
            search: new RegExp("@IsOptional\\(\\)\\s*role\\?: Role;"),
            replace: "// @IsOptional()\n  // role?: Role;"
        }
    ],
    'users/dto/user.dto.ts': [
        {
            search: "namesssss?: string;",
            replace: "name?: string;"
        }
    ],
    'grades/dto/grade.dto.ts': [
        {
            search: new RegExp("@Max\\(4\\.5\\)", "g"),
            replace: "@Max(5)"
        }
    ],
    'users/users.service.ts': [
        {
            search: new RegExp("user\\.passwordChangedAt = new Date\\(\\);\\s*return user;", "g"),
            replace: "user.passwordChangedAt = new Date();\n    return user.save();"
        },
        {
            search: new RegExp("\\.find\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".find($1).select('-passwordHash').exec()"
        },
        {
            search: new RegExp("\\.findById\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".findById($1).select('-passwordHash').exec()"
        }
    ],
    'students/students.service.ts': [
        {
            search: new RegExp("\\.find\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".find($1).select('-passwordHash').exec()"
        },
        {
            search: new RegExp("\\.findById\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".findById($1).select('-passwordHash').exec()"
        }
    ],
    'teachers/teachers.service.ts': [
        {
            search: new RegExp("\\.find\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".find($1).select('-passwordHash').exec()"
        },
        {
            search: new RegExp("\\.findById\\((.*?)\\)\\.exec\\(\\)", "g"),
            replace: ".findById($1).select('-passwordHash').exec()"
        }
    ],
    'groups/groups.service.ts': [
        {
            search: "if (user.role === Role.Estudiante)",
            replace: "if (user.role === Role.Docente)"
        }
    ],
    'enrollments/enrollments.service.ts': [
        {
            search: "if (created.status === EnrollmentStatus.Active)",
            replace: "if (created.status !== EnrollmentStatus.Active)"
        },
        {
            search: new RegExp("\\} catch \\((.*?)\\) \\{\\s*throw", "g"),
            replace: "} catch ($1) {\n      if (session) await session.abortTransaction();\n      throw"
        }
    ],
    'deletions/deletions.service.ts': [
        {
            search: new RegExp("\\} catch \\((.*?)\\) \\{\\s*throw", "g"),
            replace: "} catch ($1) {\n      if (session) await session.abortTransaction();\n      throw"
        }
    ],
    'reports/reports.service.ts': [
        {
            search: new RegExp("\\$divide:\\s*\\[([^\\]]+),\\s*([^\\]]+)\\]", "g"),
            replace: "$cond: [ { $eq: [$2, 0] }, 0, { $divide: [$1, $2] } ]"
        }
    ]
};

const controllers = [
    'subjects/subjects.controller.ts',
    'classrooms/classrooms.controller.ts',
    'faculties/faculties.controller.ts',
    'periods/periods.controller.ts',
    'programs/programs.controller.ts',
    'academic/academic.controller.ts'
];
controllers.forEach(c => {
    patches[c] = patches[c] || [];
    patches[c].push({
        search: new RegExp("(@Get\\(\\)[\\s\\S]*?findAll\\()", "g"),
        replace: "@Roles(Role.Admin, Role.Docente, Role.Estudiante)\n  $1"
    });
    patches[c].push({
        search: new RegExp("(@Get\\(':id'\\)[\\s\\S]*?findOne\\()", "g"),
        replace: "@Roles(Role.Admin, Role.Docente, Role.Estudiante)\n  $1"
    });
});

let patchedCount = 0;

for (const [filePath, filePatches] of Object.entries(patches)) {
    const fullPath = path.join(baseDir, filePath);
    if (!fs.existsSync(fullPath)) {
        console.log("File not found: " + fullPath);
        continue;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    let original = content;
    
    for (const p of filePatches) {
        if (typeof p.search === 'string') {
            // string replace only replaces first instance which is fine for most of these
            content = content.replace(p.search, p.replace);
        } else {
            content = content.replace(p.search, p.replace);
        }
    }
    
    if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log("Patched: " + filePath);
        patchedCount++;
    } else {
        console.log("No changes made in: " + filePath);
    }
}

console.log("Total files patched: " + patchedCount);
