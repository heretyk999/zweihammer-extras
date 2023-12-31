#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const args = yargs(hideBin(process.argv))
    .usage('Usage: $0 [option]... manifest')
    .version(false)
    .options({
        'release-version': {
            alias: 'v',
            describe: 'use specified release version in module manifest',
            type: 'string',
            requiresArg: true
        },
        'repository': {
            alias: ['r', 'repo'],
            describe: 'use specified github repository in module manifest',
            type: 'string',
            requiresArg: true,
            implies: ['release-tag']
        },
        'release-tag': {
            alias: 't',
            describe: 'use specified release tag in module manifest',
            type: 'string',
            requiresArg: true,
            implies: ['repository']
        },
        'release': {
            describe: 'update manifest for release (remove hot reload section)',
            implies: ['release-version', 'repository', 'release-tag'],
        },
        'in-place': {
            alias: 'i',
            describe: 'update manifest in-place',
            type: 'boolean',
            default: false,
        }
    })
    .command('$0 <manifest>', 'default command', (yargs) => {
        yargs.positional('manifest', {
            describe: 'path to module manifest file (module.json)',
            type: 'string',
        })
    })
    .parserConfiguration({
        "strip-aliased": true,
    })
    .strict()
    .help()
    .parse();

const manifestPath = args.manifest;
const manifest = JSON.parse(readFileSync(manifestPath, {encoding: 'utf-8'}));

if (args.releaseVersion) {
    manifest.version = args.releaseVersion;
}
if (args.repository) {
    const githubUrl = `https://github.com/${args.repository}`;
    const manifestUrl = `${githubUrl}/releases/latest/download/module.json`;
    const downloadUrl = `${githubUrl}/releases/download/${args.releaseTag}/module.zip`;
    manifest.url = githubUrl;
    manifest.manifest = manifestUrl;
    manifest.download = downloadUrl;
}
if (args.release) {
    delete manifest.flags;
}

const json = JSON.stringify(manifest, null, 2) + '\n';

if (args.inPlace) {
    writeFileSync(manifestPath, json);
} else {
    process.stdout.write(json);
}