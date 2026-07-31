import { Command } from 'commander';
import * as fs from 'fs';
import dotenv from 'dotenv';
import { SpotifyClient } from './spotify/client';
import { findDuplicates } from './spotify/duplicates';
import { moveToLixeira, emptyLixeira } from './spotify/lixeira';
import { exportPlaylists } from './spotify/export';
import { validateTaxonomy } from './spotify/taxonomy';

dotenv.config();

const program = new Command();

program
  .name('orgaspot')
  .description('CLI tool for organizing your Spotify account')
  .version('1.0.0');

program
  .command('scan-duplicates')
  .description('Find duplicate tracks across all playlists')
  .option('-o, --output <file>', 'Output file for duplicate report (JSON)')
  .action(async options => {
    const client = new SpotifyClient();
    await client.authenticate();
    const duplicates = await findDuplicates(client);
    console.log(`Found ${duplicates.length} duplicate track entries across playlists`);
    if (options.output) {
      fs.writeFileSync(options.output, JSON.stringify(duplicates, null, 2));
      console.log(`Report saved to ${options.output}`);
    }
  });

program
  .command('move-duplicates')
  .description('Move duplicate tracks to the lixeira playlist')
  .option(
    '-p, --playlist <name>',
    'Lixeira playlist name',
    '🧹 [LIXEIRA / REPETIDAS]',
  )
  .action(async options => {
    const client = new SpotifyClient();
    await client.authenticate();
    const duplicates = await findDuplicates(client);
    const moved = await moveToLixeira(client, duplicates, options.playlist);
    console.log(`Moved ${moved} duplicate tracks to ${options.playlist}`);
  });

program
  .command('empty-lixeira')
  .description('Empty the lixeira playlist (monthly cleanup)')
  .option(
    '-p, --playlist <name>',
    'Lixeira playlist name',
    '🧹 [LIXEIRA / REPETIDAS]',
  )
  .option('--dry-run', 'Preview without deleting')
  .action(async options => {
    const client = new SpotifyClient();
    await client.authenticate();
    const count = await emptyLixeira(client, options.playlist, options.dryRun);
    if (options.dryRun) {
      console.log(`[DRY RUN] Would permanently remove ${count} tracks from ${options.playlist}`);
    } else {
      console.log(`Removed ${count} tracks from ${options.playlist}`);
    }
  });

program
  .command('export-playlists')
  .description('Export playlists to CSV/JSON for backup')
  .option('-f, --format <format>', 'Export format: json or csv', 'json')
  .option('-o, --output <dir>', 'Output directory', './backups')
  .action(async options => {
    const client = new SpotifyClient();
    await client.authenticate();
    const files = await exportPlaylists(client, options.format, options.output);
    console.log(`Exported ${files.length} playlists to ${options.output}`);
  });

program
  .command('validate-taxonomy')
  .description('Check playlists against the naming taxonomy')
  .action(async () => {
    const client = new SpotifyClient();
    await client.authenticate();
    const violations = await validateTaxonomy(client);
    if (violations.length === 0) {
      console.log('All playlists match the taxonomy');
    } else {
      console.log(`Found ${violations.length} taxonomy violations:`);
      violations.forEach(v => {
        console.log(`  - ${v.playlist}: ${v.issue}`);
      });
    }
  });

program
  .command('setup')
  .description('Initialize: create lixeira and default taxonomy playlists')
  .action(async () => {
    const client = new SpotifyClient();
    await client.authenticate();
    await client.createPlaylist('🧹 [LIXEIRA / REPETIDAS]', true);
    console.log('Created 🧹 [LIXEIRA / REPETIDAS]');
    await client.createPlaylist('⭐ [FAVORITOS]', false);
    console.log('Created ⭐ [FAVORITOS]');
    await client.createPlaylist('📦 [ARQUIVO]', false);
    console.log('Created 📦 [ARQUIVO]');
  });

program.parse();
