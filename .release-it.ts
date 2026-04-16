import type { Config } from 'release-it';

export default {
  git: {
    commitMessage: 'chore: release v${version}',
    tagName: 'v${version}',
    tag: true,
    push: true,
  },
  github: {
    release: true,
    autoGenerate: false,
  },
  npm: {
    publish: true,
    publishArgs: ['--access public'],
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
      infile: 'CHANGELOG.md',
    },
  },
} satisfies Config;
