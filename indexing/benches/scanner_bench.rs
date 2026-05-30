use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use indexing::scanner::hash_file;
use std::fs::File;
use std::io::Write;
use tempfile::NamedTempFile;

fn generate_dummy_file(size_mb: usize) -> NamedTempFile {
    let mut file = NamedTempFile::new().unwrap();
    let chunk = vec![0u8; 1024 * 1024]; // 1MB chunk
    for _ in 0..size_mb {
        file.write_all(&chunk).unwrap();
    }
    file.flush().unwrap();
    file
}

fn bench_hash_file(c: &mut Criterion) {
    let mut group = c.benchmark_group("File Hashing Throughput (SHA-256)");

    for size_mb in [1, 10, 50].iter() {
        let file = generate_dummy_file(*size_mb);
        let path = file.path().to_path_buf();

        group.throughput(Throughput::Bytes((*size_mb as u64) * 1024 * 1024));
        group.bench_with_input(
            BenchmarkId::from_parameter(size_mb),
            size_mb,
            |b, &_size| {
                b.iter(|| {
                    let _hash = hash_file(&path).unwrap();
                });
            },
        );
    }

    group.finish();
}

criterion_group!(benches, bench_hash_file);
criterion_main!(benches);
