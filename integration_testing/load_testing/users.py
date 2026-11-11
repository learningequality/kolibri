def user_number(worker_index, workers, local_num, num_users):
    # Locust deals users evenly across --processes workers only when --users
    # is a multiple of --processes, which loadtest.py enforces.
    return (worker_index + workers * local_num) % num_users + 1
