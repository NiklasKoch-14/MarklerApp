# Claude Code Permissions & Authorized Operations

**Grant Date**: 2026-01-27
**Scope**: Full repository access with safety restrictions

## ✅ AUTHORIZED OPERATIONS

### File Operations
- ✅ **Read**: Any file in the repository (source code, configs, docs, etc.)
- ✅ **Write/Edit**: Any existing file (code, configuration, documentation)
- ✅ **Create**: New files (classes, components, services, tests, configs, migrations)
- ✅ **Rename**: Files and directories as needed for refactoring
- ✅ **Move**: Files to different locations for better organization

### Bash Commands
- ✅ **Navigation**: `cd`, `pwd`, `ls`, `tree`
- ✅ **File inspection**: `cat`, `head`, `tail`, `less`, `more`
- ✅ **File search**: `find`, `grep`, `ack`, `rg` (ripgrep)
- ✅ **File operations**: `cp`, `mv`, `mkdir`, `touch`
- ✅ **Process management**: `ps`, `kill`, `pkill`
- ✅ **System info**: `df`, `du`, `free`, `top`, `htop`
- ✅ **Text processing**: `sed`, `awk`, `sort`, `uniq`, `wc`
- ✅ **Compression**: `tar`, `gzip`, `zip`, `unzip`

### Git Operations
- ✅ **Branch management**: `git branch`, `git checkout`, `git checkout -b`, `git merge`
- ✅ **Staging**: `git add`, `git add .`, `git add -A`
- ✅ **Committing**: `git commit`, `git commit -m`, `git commit --amend`
- ✅ **Remote operations**: `git push`, `git pull`, `git fetch`
- ✅ **History**: `git log`, `git diff`, `git show`, `git blame`
- ✅ **Status**: `git status`, `git branch -a`, `git remote -v`
- ✅ **Stashing**: `git stash`, `git stash pop`, `git stash apply`
- ✅ **Reset (soft)**: `git reset --soft HEAD~1` (undo last commit, keep changes)
- ✅ **Rebase**: `git rebase` (for branch cleanup)

### Build & Development Commands
- ✅ **Maven**: `mvn clean`, `mvn install`, `mvn test`, `mvn spring-boot:run`
- ✅ **NPM**: `npm install`, `npm start`, `npm test`, `npm run build`, `npm run lint`
- ✅ **Docker**: `docker build`, `docker compose up`, `docker compose down`, `docker exec`
- ✅ **Java**: `java`, `javac`
- ✅ **Angular**: `ng serve`, `ng build`, `ng test`, `ng generate`

### Database Operations
- ✅ **Migrations**: Create Flyway migration scripts
- ✅ **Schema changes**: Modify entities, add columns, create indexes
- ✅ **Seed data**: Update data.sql for development data

### Code Modifications
- ✅ **Refactoring**: Extract methods, rename variables, improve structure
- ✅ **New features**: Implement new endpoints, components, services
- ✅ **Bug fixes**: Correct logic errors, fix validation, resolve issues
- ✅ **Performance optimization**: Add indexes, optimize queries, improve algorithms
- ✅ **Testing**: Write unit tests, integration tests, E2E tests
- ✅ **Configuration**: Modify application.yml, docker-compose.yml, angular.json, pom.xml

### Documentation
- ✅ **Code comments**: Add JavaDoc, TSDoc, inline comments
- ✅ **README updates**: Modify README.md, CLAUDE.md
- ✅ **API documentation**: Update OpenAPI/Swagger annotations
- ✅ **Specification updates**: Modify files in specs/

## ❌ PROHIBITED OPERATIONS

The following operations are **STRICTLY FORBIDDEN**:

### Git Destructive Operations
- ❌ **File deletion**: `git rm`, `rm` (except for refactoring where necessary)
- ❌ **Branch deletion**: `git branch -D`, `git branch -d` (force or regular)
- ❌ **Hard reset**: `git reset --hard` (loses uncommitted changes)
- ❌ **Force push**: `git push --force`, `git push -f` (rewrites history)
- ❌ **Clean**: `git clean -f`, `git clean -fd` (deletes untracked files)
- ❌ **Checkout discard**: `git checkout .`, `git restore .` (discards all changes)

### Destructive File Operations
- ❌ **Bulk deletion**: `rm -rf`, `rm *`
- ❌ **Dangerous overwrites**: `>` redirect without confirmation

## ⚠️ OPERATIONS REQUIRING CONFIRMATION

These operations require explicit user approval before execution:

- ⚠️ **Major architectural changes**: Changing core patterns, framework versions
- ⚠️ **Security config changes**: Modifying JWT, CORS, authentication logic
- ⚠️ **Production configs**: Changes to production database, environment variables
- ⚠️ **Dependency version bumps**: Major version updates (e.g., Spring Boot 3.x → 4.x)
- ⚠️ **Breaking API changes**: Modifications that break frontend-backend contracts

## 📋 Standard Operating Procedure

**For each significant change:**
1. ✅ Create feature branch from main
2. ✅ Make changes and test locally
3. ✅ Verify services run without errors
4. ✅ Commit with descriptive message
5. ✅ Push branch to remote (no PR creation)
6. ✅ Mark tasks as complete

**Quality Gates:**
- All code changes must pass compilation
- Services must start without errors (backend: 8085, frontend: 4200)
- No hardcoded strings in UI (use i18n)
- Follow existing code patterns and conventions
